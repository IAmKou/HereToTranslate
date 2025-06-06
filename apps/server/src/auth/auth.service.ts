import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
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

@Injectable()
export class AuthService {
  private googleClient = new OAuth2Client('580928535531-jmj6kfgfr6madkfbb7btjlb85h1sastj.apps.googleusercontent.com');
  private resolveMx = promisify(dns.resolveMx);

  constructor(
    private jwt: JwtService,
    @InjectRepository(UserEntity) private userRepository: Repository<UserEntity>,
  ) {}

  private async validateEmail(email: string): Promise<boolean> {
    try {
      const domain = email.split('@')[1];
      const mxRecords = await this.resolveMx(domain);
      return mxRecords.length > 0;
    } catch (error) {
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
      role: { id: dto.roleId } as RoleEntity,
    });

    return this.userRepository.save(user);
  }

  async loginWithGoogle(idToken: string) {
    const ticket = await this.googleClient.verifyIdToken({
      idToken,
      audience: '580928535531-jmj6kfgfr6madkfbb7btjlb85h1sastj.apps.googleusercontent.com',
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
        role: { id: 2 } as RoleEntity, // Default to member role
      });
      await this.userRepository.save(user);
    }

    const payloadToSign = {
      sub: user.id,
      username: user.username,
      role: user.role.id === 1 ? 'admin' : 'member',
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

    try {
      const payload = this.jwt.verify(token);
      const user = await this.userRepository.findOne({
        where: { id: payload.sub },
        relations: ['role'],
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      return user;
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
