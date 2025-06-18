import { RegisterDto } from "#LocalProject/Dtos";
import { UserEntity, UserRole } from "#LocalProject/Entities";
import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Repository } from "typeorm";
import * as bcrypt from "bcryptjs";
import { validateEmail } from "#LocalProject/Utils/validation";
import { InjectRepository } from "@nestjs/typeorm";
import { UpdateUserRoleDto } from "src/dto/update-user-role.dto";

@Injectable()
export class UserManagerService {
    constructor(
      @InjectRepository(UserEntity)
      private readonly userRepository: Repository<UserEntity>
    ) {}

  async register(data: RegisterDto) {
    const { username, email, phone } = data;

    const existingUsername = await this.userRepository.exists({
      where: { username }
    });
    if (existingUsername) {
      throw new ConflictException('Username already exists');
    }

    const existingEmail = await this.userRepository.exists({
      where: { email }
    });
    if (existingEmail) {
      throw new ConflictException('Email already exists');
    }

    const existingPhone = await this.userRepository.findOne({
      where: { phone }
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
      role: { id: BigInt(UserRole.Member) }
    });

    await this.userRepository.save(user);
    return { message: 'Registration successful' };
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

  async getUserProfile(uid: bigint) {
    const user = await this.userRepository.findOne({
      where: { id: uid },
      relations: ['role'],
      select: ['id', 'username', 'email', 'phone', 'fullName', 'role', 'createdProjects']
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async deleteUser(uid: bigint) {
    const user = await this.userRepository.findOne({
      where: { id: uid }
    });
    if (!user) {
      throw new BadRequestException('User not found');
    }
    await this.userRepository.remove(user);
    return { message: 'User deleted successfully' };
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

  async updateUserRole(userId: bigint, updateRoleDto: UpdateUserRoleDto, currentUser: UserEntity) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['role']
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Prevent users from changing their own role
    if (user.id === currentUser.id) {
      throw new BadRequestException('You cannot change your own role');
    }

    // Only super admins can assign admin roles
    if (updateRoleDto.role === UserRole.Admin && currentUser.role.id !== BigInt(UserRole.SuperAdmin)) {
      throw new BadRequestException('Only super admins can assign admin roles');
    }

    // Only super admins can modify admin roles
    if (user.role.id === BigInt(UserRole.Admin) && currentUser.role.id !== BigInt(UserRole.SuperAdmin)) {
      throw new BadRequestException('Only super admins can modify admin roles');
    }

    // Prevent assigning super admin role
    if (updateRoleDto.role === UserRole.SuperAdmin) {
      throw new BadRequestException('Super admin role cannot be assigned');
    }

    user.role = { id: BigInt(updateRoleDto.role) } as any;
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

  async searchUsers(search?: string): Promise<any[]> {
    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.role', 'role')
      .where('role.id != :superAdminRoleId', { superAdminRoleId: UserRole.SuperAdmin })
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
        'role.name'
      ])
      .orderBy('user.fullName', 'ASC')
      .getMany();
  }

}
