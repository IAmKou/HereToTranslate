import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../db/mysql/entity/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  async getUserProfile(userId: bigint) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['role'],
      select: {
        id: true,
        username: true,
        email: true,
        phone: true,
        fullName: true,
        createdAt: true,
        role: {
          id: true,
          name: true
        }
      }
    });

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }
} 