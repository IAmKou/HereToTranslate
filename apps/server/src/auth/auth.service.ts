import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  Logger,
  UnauthorizedException
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

type TokenMeta = {
  userId: string;
  username: string;
};
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
    private readonly jwt: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(AuthEntity, 'sqlite')
    private readonly authRepository: Repository<AuthEntity>
  ) {
    const googleClientId = this.configService.get<string>('GOOGLE_OAUTH2_CLIENT');
    if (!googleClientId) {
      throw new Error('GOOGLE_OAUTH2_CLIENT is not set in the environment variables');
    }
    this.googleClient = new OAuth2Client(googleClientId);
    this.refreshExpiry = this.configService.get<string>('REFRESH_TOKEN_EXPIRY') ?? '7d';
    this.accessExpiry = this.configService.get<string>('ACCESS_TOKEN_EXPIRY') ?? '15m';
    this.logger.log('AuthService initialized');
  }

  async refreshTokens(refreshToken: string) {
    if (!(await this.jwt.verifyAsync(refreshToken))) {
      throw new UnauthorizedException('Invalid token');
    }

    if (!await this.authRepository.exists({ where: { refreshToken }})) {
      throw new UnauthorizedException('Token expired');
    }

    const meta: TokenMeta = this.jwt.decode(refreshToken);

    const user: Nullable<UserEntity> = await this.userRepository.findOne({
      where: { id: BigInt(meta.userId) },
      relations: ['role']
    });

    if (!user) {
      this.logger.warn(`User with ID ${meta.userId} not found during token refresh`);
      await this.authRepository.delete({ refreshToken });
      throw new UnauthorizedException('User not found');
    }

    return this.generateTokenPair(user);
  }

  async validateToken(token: string | null): Promise<IUserAuthMeta> {
    if (!token) {
      throw new UnauthorizedException('Token is missing');
    }

    const tokenExists = await this.authRepository.exists({ where: {
      accessToken: token
    }})
    if (!tokenExists) {
      throw new UnauthorizedException('Token expired');
    }

    const payload = await this.jwt.verifyAsync(token);
    if (!payload) {
      throw new UnauthorizedException('Invalid token');
    }

    let user: Nullable<UserEntity>;
    try {
      user = await this.userRepository.findOne({
        where: { id: BigInt(payload.userId) },
        select: ['id', 'username']
      });
    } catch (e) {
      this.logger.error('Error fetching user from repository', e);
      throw new InternalServerErrorException('Error fetching user from repository');
    }
    if (!user) {
      await this.authRepository.delete({ accessToken: token });
      throw new UnauthorizedException('User not found');
    }
    return user as IUserAuthMeta;
  }

  async login(username: string, password: string) {
    const user = await this.userRepository.findOne({
      where: { username },
      relations: ['role']
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
    if (!payload) {
      throw new UnauthorizedException('Invalid Google token');
    }

    const { email, name } = payload;

    let user = await this.userRepository.findOne({
      where: { email },
      relations: ['role'],
    });

    if (!user?.isActive) {
      throw new UnauthorizedException('Your account have been deactivated');
    }

    if (!user) {
      const username = email;
      const existingUser = await this.userRepository.findOne({ where: { username } });
      if (existingUser) {
        throw new BadRequestException('User with this email already exists');
      }

      user = this.userRepository.create({
        username,
        email,
        passwordHash: '',
        fullName: name,
        phone: '', // Empty phone for Google users
        role: { id: BigInt(UserRole.Member) } // Default to member role
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
    const meta = await this.authRepository.findOne({
      where: { accessToken: token }
    });

    if (!meta) {
      throw new UnauthorizedException('Invalid token');
    }

    if (allSessions) {
      await this.authRepository.delete({ userId: meta.userId });
      this.logger.log(`User ${meta.userId} logged out from all sessions`);
    } else {
      await this.authRepository.delete({ accessToken: token });
      this.logger.log(`User ${meta.userId} logged out from session ${meta.sessionId}`);
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
    if (
      !session ||
      session.code !== code ||
      new Date() > session.expiresAt
    ) {
      throw new NotFoundException('Invalid or expired reset code');
    }

    return { message: 'Code verified' };
  }

  async resetPassword(email: string, code: string, newPassword: string) {
    const session = this.resetSessions.get(email);
    if (
      !session ||
      session.code !== code ||
      new Date() > session.expiresAt
    ) {
      throw new NotFoundException('Invalid or expired reset code');
    }

    const user = await this.userRepository.findOne({ where: { email } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await this.userRepository.save(user);

    this.resetSessions.delete(email); // clear session

    return { message: 'Password reset successful' };
  }

  private async generateTokenPair(user: UserEntity) {
    const jwtPayload = {
      sub: Date.now().toString(2),
      userId: user.id.toString(),
      username: user.username
    };

    const accessToken = this.jwt.sign(jwtPayload, {
      expiresIn: this.accessExpiry
    });
    const refreshToken = this.jwt.sign(jwtPayload, {
      expiresIn: this.refreshExpiry
    });

    const meta = this.authRepository.create({
      accessToken: accessToken,
      refreshToken: refreshToken,
      userId: user.id,
      sessionId: v4()
    });

    return await this.authRepository.save(meta);
  }
}
