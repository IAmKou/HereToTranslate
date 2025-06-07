import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './jwt.guard';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../db/mysql/entity/user.entity';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>,
  ) {}

  @Get()
  async findAll() {
    const users = await this.userRepository.find({
      select: ['id', 'username', 'fullName', 'email', 'phone'],
      where: { isActive: true }
    });
    return users;
  }
}