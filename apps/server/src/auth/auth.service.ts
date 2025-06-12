import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { OAuth2Client } from 'google-auth-library';
import { Repository } from 'typeorm';
import * as dns from 'dns';
import { promisify } from 'util';
import { UserEntity, UserRole } from '#LocalProject/Entities';
import { RegisterDto } from '#LocalProject/Dtos';

@Injectable()
export class AuthService {
  private readonly googleClient: OAuth2Client;
  private readonly resolveMx = promisify(dns.resolveMx);

  constructor(
    private readonly jwt: JwtService,
    private readonly configService: ConfigService,
    @InjectRepository(UserEntity) private readonly userRepository: Repository<UserEntity>,
  ) {
    const googleClientId = this.configService.get<string>('GOOGLE_OAUTH2_CLIENT');
    if (!googleClientId) {
      throw new Error('GOOGLE_OAUTH2_CLIENT is not set in the environment variables');
    }
    this.googleClient = new OAuth2Client(googleClientId);
  }

  private async validateEmail(email: string): Promise<boolean> {
    try {
      const domain = email.split('@')[1];
      const mxRecords = await this.resolveMx(domain);
      return mxRecords.length > 0;
    } catch {
      return false;
    }
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
      role: { id: UserRole.Member }
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

    // Check if email already exists
    let user = await this.userRepository.findOne({
      where: { email },
      relations: ['role']
    });
    if (!user) {
      const baseUsername = email?.split('@')[0] ?? 'user';
      let username = baseUsername;
      let counter = 1;

      while (await this.userRepository.findOne({ where: { username } })) {
        username = `${baseUsername}${counter}`;
        counter++;
      }

      user = this.userRepository.create({
        username,
        email,
        passwordHash: '', // Empty password for Google users
        fullName: name,
        phone: '', // Empty phone for Google users
        role: { id: UserRole.Member }, // Default to member role
      });
      await this.userRepository.save(user);
    }

    const payloadToSign = {
      sub: user.id,
      username: user.username,
      role: user.role.id
    };

    const token = this.jwt.sign(payloadToSign);

    return {
      token,
      role: payloadToSign.role,
      username: user.username,
    };
  }

  async login(username: string, password: string) {
    const user = await this.userRepository.findOne({
      where: { username },
      relations: ['role'],
    });

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    const payload = { sub: user.id, role: user.role.name.toLowerCase() };
    const token = this.jwt.sign(payload);

    return {
      token,
      role: user.role.name.toLowerCase(),
      username: user.username,
    };
  }


  async validateToken(token: string | null): Promise<UserEntity> {
    if (!token) {
      throw new UnauthorizedException('Token is missing');
    }

    const payload = await this.jwt.verifyAsync(token);
    if (!payload)
      throw new UnauthorizedException('Invalid or expired token');

    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
      relations: ['role'],
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }
}
