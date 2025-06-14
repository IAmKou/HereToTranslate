import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity, UserRole } from '../db/mysql/entity/user.entity';
import * as bcrypt from 'bcryptjs';
import { UpdateUserRoleDto } from '../dto/update-user-role.dto';

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
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateProfile(userId: bigint, updateData: { fullName?: string; phone?: string; email?: string }) {
    const user = await this.userRepository.findOne({
      where: { id: userId }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (updateData.phone && updateData.phone !== user.phone) {
      const existingUser = await this.userRepository.findOne({
        where: { phone: updateData.phone }
      });
      if (existingUser) {
        throw new BadRequestException('Phone number already in use');
      }
    }

    Object.assign(user, updateData);
    return this.userRepository.save(user);
  }

  async changePassword(userId: bigint, currentPassword: string, newPassword: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.passwordHash = hashedPassword;
    
    return this.userRepository.save(user);
  }

  async getAllUsers() {
    return this.userRepository.find({
      relations: ['role'],
      select: {
        id: true,
        username: true,
        email: true,
        phone: true,
        fullName: true,
        isActive: true,
        createdAt: true,
        role: {
          id: true,
          name: true
        }
      }
    });
  }

  async updateUserRole(userId: bigint, updateRoleDto: UpdateUserRoleDto) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['role']
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.role = { id: updateRoleDto.role } as any;
    return this.userRepository.save(user);
  }

  async toggleUserStatus(userId: bigint) {
    const user = await this.userRepository.findOne({
      where: { id: userId }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.isActive = !user.isActive;
    return this.userRepository.save(user);
  }
} 