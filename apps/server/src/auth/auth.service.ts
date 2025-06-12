import { Injectable, UnauthorizedException, ConflictException, BadRequestException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { UserEntity } from '../db/mysql/entity/user.entity';
import { Repository } from 'typeorm';
import { RegisterDto } from '../db/dto/register.dto';
import * as bcrypt from 'bcryptjs';
import { RoleEntity } from '../db/mysql/entity/role.entity';
import { OAuth2Client } from 'google-auth-library';
import * as dns from 'dns';
import { promisify } from 'util';
import { ConfigService } from '@nestjs/config';

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
  private readonly resolveMx = promisify(dns.resolveMx);
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly jwt: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(UserEntity) private readonly userRepository: Repository<UserEntity>,
  ) {
    const googleClientId = this.configService.get<string>('GOOGLE_OAUTH2_CLIENT');
    if (!googleClientId) {
      throw new Error('GOOGLE_CLIENT_ID is not set in the environment variables');
    }
    this.googleClient = new OAuth2Client(googleClientId);
    this.logger.log('AuthService initialized');
  }

  private async validateEmail(email: string): Promise<boolean> {
    try {
      const domain = email.split('@')[1];
      const mxRecords = await this.resolveMx(domain);
      return mxRecords.length > 0;
    } catch (error) {
      return false;
    }
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

  async register(dto: RegisterDto) {
    // Check for duplicate username
    const existingUsername = await this.userRepository.findOne({
      where: { username: dto.username }
    });
    if (existingUsername) {
      throw new ConflictException('Username already exists');
    }

    // Check for duplicate email
    const existingEmail = await this.userRepository.findOne({
      where: { email: dto.email }
    });
    if (existingEmail) {
      throw new ConflictException('Email already exists');
    }

    // Check for duplicate phone
    const existingPhone = await this.userRepository.findOne({
      where: { phone: dto.phone }
    });
    if (existingPhone) {
      throw new ConflictException('Phone number already exists');
    }

    // Validate email domain
    const isEmailValid = await this.validateEmail(dto.email);
    if (!isEmailValid) {
      throw new BadRequestException('Invalid email domain');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = this.userRepository.create({
      ...dto,
      passwordHash,
      role: { id: 2 } as RoleEntity,
    });

    await this.userRepository.save(user);
    return { message: 'Registration successful' };
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
      relations: ['role']
    });

    if (!user) {
      const username = email;
      const existingUser = await this.userRepository.findOne({ where: { username } });
      if (existingUser) {
        throw new Error('User with this email already exists');
      }

      user = this.userRepository.create({
        username,
        email,
        passwordHash: '',
        fullName: name,
        phone: '',
        role: { id: 2 } as RoleEntity,
      });
      await this.userRepository.save(user);
    }

    return this.generateTokenPair(user);
  }

  async login(username: string, password: string) {
    const user = await this.userRepository.findOne({
      where: { username },
      relations: ['role'],
    });

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    return this.generateTokenPair(user);
  }

  async refreshTokens(refreshToken: string) {
    const actualRToken = /^Bearer (.+)$/.exec(refreshToken)?.[1];
    if (!actualRToken) {
      throw new UnauthorizedException('Invalid token format');
    }

    try {
      if (!(await this.jwt.verifyAsync(actualRToken))) {
        throw new UnauthorizedException('Invalid token');
      }
    } catch (e) {
      throw new UnauthorizedException('Invalid token');
    }

    if (!this.refreshTokenMap.has(actualRToken)) {
      throw new UnauthorizedException('Token expired');
    }

    const aToken = this.refreshTokenMap.get(actualRToken);
    if (aToken) {
      this.activeTokens.delete(aToken);
    }

    const tokenData = this.jwt.decode(actualRToken) as TokenMeta;
    this.refreshTokenMap.delete(actualRToken);

    const tokens = this.tokenMap.get(tokenData.userId);
    tokens?.delete(actualRToken);
    tokens?.delete(aToken!);

    const user = await this.userRepository.findOne({
      where: { id: BigInt(tokenData.userId) },
      relations: ['role']
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return this.generateTokenPair(user);
  }

  async logout(refreshToken: string, allSessions = false) {
    const actualRToken = /^Bearer (.+)$/.exec(refreshToken)?.[1];
    if (!actualRToken) {
      throw new UnauthorizedException('Invalid token format');
    }

    const tokenData = this.jwt.decode(actualRToken) as TokenMeta;
    const userId = tokenData.userId;

    this.activeTokens.delete(actualRToken);
    this.refreshTokenMap.delete(actualRToken);
    this.tokenMap.get(userId)?.delete(actualRToken);

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

  async validateToken(token: string | null): Promise<UserEntity> {
    if (!token) {
      throw new UnauthorizedException('Token is missing');
    }

 

    if (!this.activeTokens.has(token)) {
      throw new UnauthorizedException('Token expired');
    }

    try {
      const payload = await this.jwt.verifyAsync(token);
      if (!payload) {
        throw new UnauthorizedException('Invalid token');
      }

      const user = await this.userRepository.findOne({
        where: { id: BigInt(payload.userId) },
        relations: ['role'],
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      return user;
    } catch (e) {
      this.activeTokens.delete(token);
      throw new UnauthorizedException('Invalid token');
    }
  }
}
