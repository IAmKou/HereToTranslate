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

import { IUserAuthMeta } from '@here-to-translate/common/interfaces';
import { UserTypeEntity } from '#LocalProject/Entities';
import { MailerService } from '@nestjs-modules/mailer';
import * as crypto from 'crypto';

type ResetSession = {
  code: string;
  expiresAt: Date;
};

@Injectable()
export class AuthService {
  private readonly googleClient: OAuth2Client;
  private readonly logger = new Logger(AuthService.name);
  private resetSessions = new Map<string, ResetSession>();

  private readonly refreshExpiry: string;
  private readonly accessExpiry: string;

  constructor(
    private mailerService: MailerService,
    public readonly jwt: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
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
      this.configService.get<string>('ACCESS_TOKEN_EXPIRY') ?? '1h';
    this.logger.log('AuthService initialized');
  }

  async refreshTokens(refreshToken: string) {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is missing');
    }

    try {
      // Verify the refresh token
      const payload = this.jwt.verify(refreshToken);

      // Get user from database
      const user = await this.userRepository.findOne({
        where: { id: BigInt(payload.userId) },
        relations: ['role'],
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      if (!user.isActive) {
        throw new UnauthorizedException('Your account has been deactivated');
      }

      return this.generateTokenPair(user);
    } catch (error) {
      this.logger.error(`Token refresh failed: ${error instanceof Error ? error.message : String(error)}`);
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async validateToken(
    token: string | null
  ): Promise<
    IUserAuthMeta & { avatarUrl?: string; fullName?: string; email?: string }
  > {
    if (!token) {
      throw new UnauthorizedException('Token is missing');
    }

    this.logger.log(`Validating token: ${token.substring(0, 20)}...`);

    try {
      // Verify the JWT token
      const payload = this.jwt.verify(token);

      // Get user from database
      const user = await this.userRepository.findOne({
        where: { id: BigInt(payload.userId) },
        relations: ['role'],
      });

      if (!user) {
        this.logger.warn('User not found for token');
        throw new UnauthorizedException('User not found');
      }

      if (!user.isActive) {
        throw new UnauthorizedException('Your account has been deactivated');
      }

      this.logger.log(`Token validation successful for user: ${user.username}`);

      return {
        id: user.id,
        username: user.username,
        role: Number(user.role.id),
        avatarUrl: user.avatarUrl,
        fullName: user.fullName,
        email: user.email,
      };
    } catch (error) {
      this.logger.error(`Token validation failed: ${error instanceof Error ? error.message : String(error)}`);
      throw new UnauthorizedException('Invalid token');
    }
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

    let user = await this.userRepository.findOne({
      where: { email },
      relations: ['role'],
    });

    console.log('Found user for Google login:', user);

    // Check if existing user is active
    if (user && !user.isActive) {
      throw new UnauthorizedException('Your account has been deactivated');
    }

    if (!user) {
      const username = email;
      const existingUser = await this.userRepository.findOne({
        where: { username },
      });
      if (existingUser)
        throw new BadRequestException('User with this email already exists');

      // Find Member role from database
      const memberRole = await this.roleRepository.findOne({
        where: { name: 'MEMBER' },
      });

      if (!memberRole) {
        throw new Error('Member role not found in database');
      }

      user = this.userRepository.create({
        username,
        email,
        passwordHash: '',
        fullName: name,
        phone: '',
        role: memberRole,
        isActive: true,
      });
      await this.userRepository.save(user);
    }

    if (!user.role) {
      user.role = { id: BigInt(UserRole.Member) } as any;
      await this.userRepository.save(user);
    }

    return this.generateTokenPair(user);
  }

  async logout(token: string, allSessions = false) {
    this.logger.log('User logged out');
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
