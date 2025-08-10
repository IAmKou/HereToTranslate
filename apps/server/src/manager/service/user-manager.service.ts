import {
  RegisterDto,
  UpdateUserPasswordDto,
  UpdateUserProfileDto,
} from '#LocalProject/Dtos';
import { UserEntity, UserRole, UserTypeEntity } from '#LocalProject/Entities';
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DeepPartial, In, Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import type { AuthenticatedRequest } from '#LocalProject/Auth/types';
import { validateEmail } from '#LocalProject/Utils/validation';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class UserManagerService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(UserTypeEntity)
    private readonly roleRepository: Repository<UserTypeEntity>
  ) {}

  async register(data: RegisterDto) {
    const { username, email, phone } = data;

    const existingUsername = await this.userRepository.exists({
      where: { username },
    });
    if (existingUsername) {
      throw new ConflictException('Username already exists');
    }

    const existingEmail = await this.userRepository.exists({
      where: { email },
    });
    if (existingEmail) {
      throw new ConflictException('Email already exists');
    }

    const existingPhone = await this.userRepository.findOne({
      where: { phone },
    });
    if (existingPhone) {
      throw new ConflictException('Phone number already exists');
    }

    // Validate email domain
    const isEmailValid = await validateEmail(email);
    if (!isEmailValid) {
      throw new BadRequestException('Invalid email domain');
    }

    const passwordHash = await bcrypt.hash(data.password, 10);
    const user = this.userRepository.create({
      ...data,
      passwordHash,
      role: { id: UserRole.Member.toString() },
    } as DeepPartial<UserEntity>);

    await this.userRepository.save(user);
    return { message: 'Registration successful' };
  }

  async updateProfile(userId: bigint, updateData: UpdateUserProfileDto) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Unknown user');
    }

    if (updateData.phone && updateData.phone !== user.phone) {
      const existingUser = await this.userRepository.findOne({
        where: { phone: updateData.phone },
      });
      if (existingUser) {
        throw new BadRequestException('Phone number already in use');
      }
    }

    Object.assign(user, updateData);
    return this.userRepository.save(user);
  }

  async getUserProfile(uid: bigint) {
    const user = await this.userRepository.findOne({
      where: { id: uid },
      relations: ['role'],
      select: [
        'id',
        'username',
        'email',
        'phone',
        'fullName',
        'role',
        'createdProjects',
        'avatarUrl',
      ],
    });

    if (!user) {
      throw new NotFoundException('Unknown user');
    }
    return user;
  }
  async findUsersByIds(ids: number[]) {
    return this.userRepository.find({
      where: { id: In(ids) },
      select: ['id', 'username', 'email', 'phone'],
    });
  }

  async deleteUser(uid: bigint) {
    const user = await this.userRepository.findOne({
      where: { id: uid },
    });
    if (!user) {
      throw new BadRequestException('Unknown user');
    }
    await this.userRepository.remove(user);
    return { message: 'User deleted successfully' };
  }

  async changePassword(userId: bigint, data: UpdateUserPasswordDto) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Unknown user');
    }

    const { currentPassword, newPassword } = data;

    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.passwordHash
    );
    if (!isPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);

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
        avatarUrl: true, // ✅ Thêm dòng này
        role: {
          id: true,
          name: true,
        },
      },
    });
  }

  async updateUserRole(
    userId: bigint,
    roleId: number,
    currentUser: AuthenticatedRequest
  ) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['role'],
    });

    if (!user) {
      throw new NotFoundException('Unknown user');
    }

    if (user.id === currentUser.user.id) {
      throw new BadRequestException('You cannot change your own role');
    }

    if (
      roleId === UserRole.Admin &&
      currentUser.user.role !== UserRole.SuperAdmin
    ) {
      throw new BadRequestException('Only super admins can assign admin roles');
    }

    if (user.role.id === '2' && currentUser.user.role !== UserRole.SuperAdmin) {
      throw new BadRequestException('Only super admins can modify admin roles');
    }

    if (roleId === UserRole.SuperAdmin) {
      throw new BadRequestException('Super admin role cannot be assigned');
    }

    const newRole = await this.roleRepository.findOneBy({
      id: roleId.toString(),
    });
    if (!newRole) {
      throw new NotFoundException('Role not found');
    }

    user.role = newRole;
    await this.userRepository.save(user);

    return this.userRepository.findOne({
      where: { id: userId },
      relations: ['role'],
    });
  }
  async searchByEmailOrUsername(
    identifier: string
  ): Promise<UserEntity | null> {
    return this.userRepository.findOne({
      where: [{ email: identifier }, { username: identifier }],
      select: ['id', 'username', 'email'],
    });
  }

  async toggleUserStatus(userId: bigint) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('Unknown user');
    }

    user.isActive = !user.isActive;
    return this.userRepository.save(user);
  }
  async findUserById(
    userId: number
  ): Promise<{ id: number; username: string } | null> {
    const user = await this.userRepository.findOne({
      where: { id: BigInt(userId) },
      select: ['id', 'username'],
    });

    if (!user) return null;

    return {
      id: Number(user.id),
      username: user.username,
    };
  }

  async searchUsers(search?: string): Promise<any[]> {
    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.role', 'role')
      .where('role.id != :superAdminRoleId', {
        superAdminRoleId: UserRole.SuperAdmin,
      })
      .andWhere('user.isActive = :isActive', { isActive: true });

    if (search) {
      queryBuilder.andWhere(
        '(LOWER(user.fullName) LIKE :search OR LOWER(user.username) LIKE :search OR LOWER(user.email) LIKE :search)',
        { search: `%${search.toLowerCase()}%` }
      );
    }

    return queryBuilder
      .select([
        'user.id',
        'user.username',
        'user.fullName',
        'user.email',
        'role.id',
        'role.name',
      ])
      .orderBy('user.fullName', 'ASC')
      .getMany();
  }

  async updateAvatar(userId: number, avatarUrl: string) {
    await this.userRepository.update(userId, { avatarUrl });
  }
}
