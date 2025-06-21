import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
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

type AccessToken = string;
type RefreshToken = string;
type TokenMeta = {
  userId: string;
  username: string;
  role: string;
};

@Injectable()
export class AuthService {
  private readonly refreshTokenMap = new Map<RefreshToken, AccessToken>();
  private readonly activeTokens = new Set<AccessToken>();
  private readonly tokenMap = new Map<string, Set<RefreshToken | AccessToken>>();
  private readonly googleClient: OAuth2Client;
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly jwt: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>
  ) {
    const googleClientId = this.configService.get<string>('GOOGLE_OAUTH2_CLIENT');
    if (!googleClientId) {
      throw new Error('GOOGLE_OAUTH2_CLIENT is not set in the environment variables');
    }
    this.googleClient = new OAuth2Client(googleClientId);
    this.logger.log('AuthService initialized');
  }

  async refreshTokens(refreshToken: string) {
    if (!refreshToken) {
      throw new UnauthorizedException('Invalid token format');
    }

    if (!(await this.jwt.verifyAsync(refreshToken))) {
      throw new UnauthorizedException('Invalid token');
    }

    if (!this.refreshTokenMap.has(refreshToken)) {
      throw new UnauthorizedException('Token expired');
    }

    const accessToken = this.refreshTokenMap.get(refreshToken);
    this.refreshTokenMap.delete(refreshToken);
    const tokenData: TokenMeta = this.jwt.decode(refreshToken);
    const tokens = this.tokenMap.get(tokenData.userId);

    tokens?.delete(refreshToken);
    if (accessToken) {
      this.activeTokens.delete(accessToken);
      tokens?.delete(accessToken);
    }

    const user = await this.userRepository.findOne({
      where: { id: BigInt(tokenData.userId) },
      relations: ['role']
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return this.generateTokenPair(user);
  }

  async validateToken(token: string | null): Promise<IUserAuthMeta> {
    if (!token) {
      throw new UnauthorizedException('Token is missing');
    }

    if (!this.activeTokens.has(token)) {
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
        relations: ['role'],
        select: ['id', 'username']
      });
    } catch (e) {
      this.logger.error('Error fetching user from repository', e);
      throw new InternalServerErrorException('Error fetching user from repository');
    }
    if (!user) {
      this.activeTokens.delete(token);
      throw new UnauthorizedException('User not found');
    }
    return user as IUserAuthMeta;
  }

  async login(username: string, password: string) {
    const user = await this.userRepository.findOne({
      where: { username },
      relations: ['role']
    });
    if(!user?.isActive) {
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
      audience: this.configService.get<string>('GOOGLE_OAUTH2_CLIENT')
    });

    const payload = ticket.getPayload();
    if (!payload) throw new UnauthorizedException('Invalid Google token');

    const { email, name } = payload;

    let user = await this.userRepository.findOne({
      where: { email },
      relations: ['role']
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

    return this.generateTokenPair(user);
  }

  async logout(refreshToken: string, allSessions = false) {
    if (!refreshToken) {
      throw new UnauthorizedException('Invalid token format');
    }

    const tokenData: TokenMeta = this.jwt.decode(refreshToken);
    const userId = tokenData.userId;

    this.activeTokens.delete(refreshToken);
    this.refreshTokenMap.delete(refreshToken);
    this.tokenMap.get(userId)?.delete(refreshToken);

    if (allSessions) {
      const tokens = this.tokenMap.get(userId);
      if (tokens) {
        for (const t of tokens) {
          this.refreshTokenMap.delete(t);
          this.activeTokens.delete(t);
        }
        this.tokenMap.delete(userId);
      }
    }

    return { message: 'Logged out successfully' };
  }

  private generateTokenPair(user: UserEntity) {
    const tokenMeta: TokenMeta = {
      userId: user.id.toString(),
      username: user.username,
      role: user.role.name.toLowerCase()
    };

    const jwtPayload = {
      sub: Date.now().toString(2),
      ...tokenMeta
    };

    const accessToken = this.jwt.sign(jwtPayload, {
      expiresIn: '15m'
    });
    const refreshToken = this.jwt.sign(jwtPayload, {
      expiresIn: '7d'
    });

    this.activeTokens.add(accessToken);
    this.refreshTokenMap.set(refreshToken, accessToken);

    const userId = user.id.toString();
    const tokens = this.tokenMap.get(userId);
    if (tokens) {
      tokens.add(accessToken);
      tokens.add(refreshToken);
    } else {
      this.tokenMap.set(userId, new Set([accessToken, refreshToken]));
    }

    return {
      accessToken,
      refreshToken,
      role: tokenMeta.role,
      username: user.username
    };
  }
}
