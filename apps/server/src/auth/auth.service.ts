import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { UserEntity } from '../db/mysql/entity/user.entity';
import { Repository } from 'typeorm';
import { RegisterDto } from '../db/dto/register.dto';
import * as bcrypt from 'bcryptjs';
import { RoleEntity } from '../db/mysql/entity/role.entity';
import { OAuth2Client } from 'google-auth-library';


@Injectable()
export class AuthService {
  private googleClient = new OAuth2Client('YOUR_GOOGLE_CLIENT_ID');
  constructor(
    private jwt: JwtService,
    @InjectRepository(UserEntity) private userRepository: Repository<UserEntity>,
  ) {}

  async register(dto: RegisterDto) {
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = this.userRepository.create({ ...dto, passwordHash });
    return this.userRepository.save(user);
  }

  async loginWithGoogle(idToken: string) {
    const ticket = await this.googleClient.verifyIdToken({
      idToken,
      audience: 'YOUR_GOOGLE_CLIENT_ID',
    });

    const payload = ticket.getPayload();
    if (!payload) throw new UnauthorizedException('Invalid Google token');

    const { email, name } = payload;

    let user = await this.userRepository.findOne({ where: { email } });

    if (!user) {
      user = this.userRepository.create({
        username: email,
        email,
        passwordHash: '',
        fullName: name,
        phone: '',
        role: {id : 2} as RoleEntity,
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

    const payload = { sub: user.id, role: user.role.name };
    const token = this.jwt.sign(payload);

    return {
      token,
      role: user.role.name,
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
