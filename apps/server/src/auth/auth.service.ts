import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { UserEntity } from '../db/mysql/entity/user.entity';
import { Repository } from 'typeorm';
import { JwtTokenEntity } from '../db/mysql/entity/jwtTokens.entity';
import { RegisterDto } from '../db/dto/register.dto';
import * as bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AuthService {
  constructor(
    private jwt: JwtService,
    @InjectRepository(UserEntity) private userRepository: Repository<UserEntity>,
    @InjectRepository(JwtTokenEntity) private jwtRepository : Repository<JwtTokenEntity>,
  ) {}

  async register(dto: RegisterDto) {
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = this.userRepository.create({ ...dto,passwordHash});
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
    const token = this.jwt.sign(payload);

    const expireAt = new Date(Date.now() + 5 * 60 * 1000);
    const jwtToken = this.jwtRepository.create({
      id: uuidv4(),
      token,
      user: { id: user.id } as UserEntity,
      expiresAt: expireAt,
    });

    await this.jwtRepository.save(jwtToken);
    return { token };
  }

  async validateToken(token: string | null): Promise<UserEntity> {
    const tokenEnity = await this.jwtRepository.findOne({
      where: {token, isUsed: false},
      relations: ['user'],
    });
    if (!tokenEnity) throw new UnauthorizedException('Invalid token');

    const now = new Date();
    if(tokenEnity.expiresAt < now){
      throw new UnauthorizedException('Token expired');
    }

    tokenEnity.lastUsedAt = now;
    tokenEnity.expiresAt = new Date(Date.now() + 5*60*1000);
    await this.jwtRepository.save(tokenEnity);

    return tokenEnity.user;
}
  async logout(token : string){
    await this.jwtRepository.delete(token);
  }


}
