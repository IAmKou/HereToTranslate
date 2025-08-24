import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import { Repository } from 'typeorm';
import { UserEntity, UserRole } from '#LocalProject/Entities';
import { Nullable } from '@here-to-translate/common/types';
import { IUserAuthMeta } from '@here-to-translate/common/interfaces';
import { AuthEntity } from '#LocalProject/SqliteEntities';
import { v4 } from 'uuid';
import { MailerService } from '@nestjs-modules/mailer';
import * as crypto from 'crypto';
import { setInterval } from 'timers';
import { LessThan } from 'typeorm';
import { UserTypeEntity } from '#LocalProject/Entities';

type ResetSession = {
  code: string;
  expiresAt: Date;
};

@Injectable()
export class AuthService {
  private readonly googleClient: OAuth2Client;
  private readonly logger = new Logger(AuthService.name);
  private resetSessions = new Map<string, ResetSession>();
  private sessionCleanupInterval: NodeJS.Timeout;

  private readonly refreshExpiry: string;
  private readonly accessExpiry: string;

  constructor(
    private mailerService: MailerService,
    private readonly jwt: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(AuthEntity, 'sqlite')
    private readonly authRepository: Repository<AuthEntity>,
    @InjectRepository(UserTypeEntity)
    private readonly roleRepository: Repository<UserTypeEntity>
  ) {
    const googleClientId = this.configService.get<string>(
      'GOOGLE_OAUTH2_CLIENT'
    );
    if (!googleClientId) {
      throw new Error(
        'GOOGLE_OAUTH2_CLIENT is not set in the environment variables'
      );
    }
    this.googleClient = new OAuth2Client(googleClientId);
    this.refreshExpiry =
      this.configService.get<string>('REFRESH_TOKEN_EXPIRY') ?? '7d';
    this.accessExpiry =
      this.configService.get<string>('ACCESS_TOKEN_EXPIRY') ?? '30m';
    this.sessionCleanupInterval = setInterval(
      () => this.cleanupExpiredSessions(),
      60 * 1000
    ); // every 1 min
    this.logger.log('AuthService initialized');
  }

  private async cleanupExpiredSessions() {
    const now = new Date();
    await this.authRepository.delete({ accessTokenExpiresAt: LessThan(now) });
    await this.authRepository.delete({
      lastActivityAt: LessThan(new Date(now.getTime() - 30 * 60 * 1000)),
    }); // 30 min inactivity
  }

  async refreshTokens(refreshToken: string) {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is missing');
    }
    const meta = await this.authRepository.findOne({ where: { refreshToken } });
    if (!meta) {
      throw new UnauthorizedException('Refresh token expired or invalid');
    }
    const now = new Date();
    if (meta.refreshTokenExpiresAt < now) {
      await this.authRepository.delete({ refreshToken });
      throw new UnauthorizedException('Refresh token expired');
    }
    // Inactivity check (30 min)
    if (meta.lastActivityAt < new Date(now.getTime() - 30 * 60 * 1000)) {
      await this.authRepository.delete({ refreshToken });
      throw new UnauthorizedException('Session expired due to inactivity');
    }
    // Update last activity
    meta.lastActivityAt = now;
    await this.authRepository.save(meta);
    // Fetch user info
    const user: Nullable<UserEntity> = await this.userRepository.findOne({
      where: { id: meta.userId },
      relations: ['role'],
    });
    if (!user) {
      this.logger.warn(
        `User with ID ${meta.userId} not found during token refresh`
      );
      await this.authRepository.delete({ refreshToken });
      throw new UnauthorizedException('User not found');
    }
    return this.generateTokenPair(user);
  }

  async validateToken(token: string | null): Promise<IUserAuthMeta & { avatarUrl?: string; fullName?: string; email?: string }> {
    if (!token) {
      throw new UnauthorizedException('Token is missing');
    }
    const meta = await this.authRepository.findOne({
      where: { accessToken: token },
    });
    if (!meta) {
      throw new UnauthorizedException('Token expired or invalid');
    }
    const now = new Date();
    if (meta.accessTokenExpiresAt < now) {
      await this.authRepository.delete({ accessToken: token });
      throw new UnauthorizedException('Token expired');
    }
    // Inactivity check (30 min)
    if (meta.lastActivityAt < new Date(now.getTime() - 30 * 60 * 1000)) {
      await this.authRepository.delete({ accessToken: token });
      throw new UnauthorizedException('Session expired due to inactivity');
    }
    // Update last activity
    meta.lastActivityAt = now;
    await this.authRepository.save(meta);
    const user = await this.userRepository.findOne({
      where: { id: meta.userId },
      relations: ['role'],
    });
    if (!user) {
      await this.authRepository.delete({ accessToken: token });
      throw new UnauthorizedException('User not found');
    }
    return {
      id: user.id,
      username: user.username,
      role: Number(user.role.id),
      avatarUrl: user.avatarUrl,
      fullName: user.fullName,
      email: user.email,
    };
  }

  async login(username: string, password: string) {
    const user = await this.userRepository.findOne({
      where: { username },
      relations: ['role'],
    });
    if (!user?.isActive) {
      throw new UnauthorizedException('Your account have been deactivated');
    }

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    return this.generateTokenPair(user);
  }

  async loginWithGoogle(idToken: string) {
    const ticket = await this.googleClient.verifyIdToken({
      idToken,
      audience: this.configService.get<string>('GOOGLE_OAUTH2_CLIENT'),
    });

    const payload = ticket.getPayload();
    if (!payload) throw new UnauthorizedException('Invalid Google token');

    const { email, name } = payload;

    if (!email) {
      throw new UnauthorizedException('Email not provided in Google token');
    }

    if (!name) {
      throw new UnauthorizedException('Name not provided in Google token');
    }

    let user = await this.userRepository.findOne({
      where: { email },
      relations: ['role'],
    });

    console.log('Found user for Google login:', user);

    // If user exists (either from normal registration or previous OAuth), log them in
    // Check if existing user is active
    if (user && !user.isActive) {
      throw new UnauthorizedException('Your account has been deactivated');
    }

    if (!user) {
      // User doesn't exist, create a new account for them
      // Generate a unique username based on email
      const baseUsername = email.split('@')[0]; // Use part before @ as base username
      let counter = 1;
      let finalUsername = baseUsername;

      // Keep trying until we find a unique username
      while (await this.userRepository.findOne({ where: { username: finalUsername } })) {
        finalUsername = `${baseUsername}${counter}`;
        counter++;
      }

      // Find Member role from database
      const memberRole = await this.roleRepository.findOne({
        where: { name: 'MEMBER' }
      });

      if (!memberRole) {
        throw new Error('Member role not found in database');
      }

      user = this.userRepository.create({
        username: finalUsername,
        email,
        passwordHash: '',
        fullName: name,
        phone: null,
        role: memberRole,
        isActive: true,
      });
      await this.userRepository.save(user);
    }

    if (!user.role) {
      user.role = { id: BigInt(UserRole.Member) } as any;
      await this.userRepository.save(user);
    }

    // Generate and return tokens for the user (either existing or newly created)
    return this.generateTokenPair(user);
  }


  async logout(token: string, allSessions = false) {
    const meta = await this.authRepository.findOne({
      where: [{ accessToken: token }, { refreshToken: token }],
    });

    if (!meta) {
      throw new UnauthorizedException('Invalid token');
    }

    if (allSessions) {
      await this.authRepository.delete({ userId: meta.userId });
      this.logger.log(`User ${meta.userId} logged out from all sessions`);
    } else {
      await this.authRepository.delete({ sessionId: meta.sessionId });
      this.logger.log(
        `User ${meta.userId} logged out from session ${meta.sessionId}`
      );
    }

    return { message: 'Logged out successfully' };
  }

  async sendResetCode(email: string) {
    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const code = crypto.randomBytes(3).toString('hex');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    this.resetSessions.set(email, { code, expiresAt });

    await this.mailerService.sendMail({
      to: email,
      subject: 'Password Reset Code',
      template: './reset-code',
      context: { code },
    });

    return { message: 'Reset code sent' };
  }

  async verifyResetCode(email: string, code: string) {
    const session = this.resetSessions.get(email);
    if (!session || session.code !== code || new Date() > session.expiresAt) {
      throw new NotFoundException('Invalid or expired reset code');
    }

    return { message: 'Code verified' };
  }

  async resetPassword(email: string, code: string, newPassword: string) {
    const session = this.resetSessions.get(email);
    if (!session || session.code !== code || new Date() > session.expiresAt) {
      throw new NotFoundException('Invalid or expired reset code');
    }

    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await this.userRepository.save(user);

    this.resetSessions.delete(email);

    return { message: 'Password reset successful' };
  }

  public getExpiryDate(duration: string): Date {
    // duration:  '15m', '7d'
    const now = new Date();
    const match = duration.match(/(\d+)([smhd])/);
    if (!match) return now;
    const value = parseInt(match[1], 10);
    switch (match[2]) {
      case 's':
        return new Date(now.getTime() + value * 1000);
      case 'm':
        return new Date(now.getTime() + value * 60 * 1000);
      case 'h':
        return new Date(now.getTime() + value * 60 * 60 * 1000);
      case 'd':
        return new Date(now.getTime() + value * 24 * 60 * 60 * 1000);
      default:
        return now;
    }
  }

  private async generateTokenPair(user: UserEntity) {
    const now = new Date();
    const accessTokenExpiresAt = this.getExpiryDate(this.accessExpiry);
    const refreshTokenExpiresAt = this.getExpiryDate(this.refreshExpiry);
    const jwtPayload = {
      sub: Date.now().toString(2),
      userId: user.id.toString(),
      username: user.username,
    };
    const accessToken = this.jwt.sign(jwtPayload, {
      expiresIn: this.accessExpiry,
    });
    const refreshToken = this.jwt.sign(jwtPayload, {
      expiresIn: this.refreshExpiry,
    });
    const meta = this.authRepository.create({
      accessToken,
      refreshToken,
      userId: user.id,
      sessionId: v4(),
      accessTokenExpiresAt,
      refreshTokenExpiresAt,
      lastActivityAt: now,
    });
    await this.authRepository.save(meta);
    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        role: {
          id: Number(user.role.id),
          name: user.role.name,
        },
        avatarUrl: user.avatarUrl,
        fullName: user.fullName,
        email: user.email,
      },
    };
  }
}
