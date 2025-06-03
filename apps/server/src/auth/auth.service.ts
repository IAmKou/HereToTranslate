import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { UserEntity } from '../db/mysql/entity/user.entity';
import { Repository } from 'typeorm';
import { RegisterDto } from '../db/dto/register.dto';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class AuthService {
  constructor(
    private jwt: JwtService,
    @InjectRepository(UserEntity) private userRepository: Repository<UserEntity>,
  ) {}

  async register(dto: RegisterDto) {
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = this.userRepository.create({ ...dto, passwordHash });
    return this.userRepository.save(user);
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
    // Sign the JWT token with the secret key defined in JWT module config
    const token = this.jwt.sign(payload);

    return { token };
  }

  // Validate by verifying the token and fetching the user from DB
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
