import { RegisterDto } from "#LocalProject/Dtos";
import { UserEntity, UserRole } from "#LocalProject/Entities";
import { BadRequestException, ConflictException, Injectable } from "@nestjs/common";
import { Repository } from "typeorm";
import * as bcrypt from "bcryptjs";
import { validateEmail } from "#LocalProject/Utils/validation";
import { InjectRepository } from "@nestjs/typeorm";

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

  async update(uid: bigint, data: Partial<RegisterDto>) {
    const { username, email, phone } = data;
    const user = await this.userRepository.findOne({
      where: { id: uid }
    });
    if (!user) {
      throw new BadRequestException('User not found');
    }
    if (username) {
      const existingUsername = await this.userRepository.exists({
        where: { username }
      });
      if (existingUsername) {
        throw new ConflictException('Username already exists');
      }
      user.username = username;
    }
    if (email) {
      const existingEmail = await this.userRepository.exists({
        where: { email }
      });
      if (existingEmail) {
        throw new ConflictException('Email already exists');
      }
      // Validate email domain
      const isEmailValid = await validateEmail(email);
      if (!isEmailValid) {
        throw new BadRequestException('Invalid email domain');
      }
      user.email = email;
    }
    if (phone) {
      const existingPhone = await this.userRepository.findOne({
        where: { phone }
      });
      if (existingPhone) {
        throw new ConflictException('Phone number already exists');
      }
      user.phone = phone;
    }
    if (data.password) {
      user.passwordHash = await bcrypt.hash(data.password, 10);
    }
    await this.userRepository.save(user);
    return { message: 'User updated successfully' };
  }

  async getUser(uid: bigint) {
    const user = await this.userRepository.findOne({
      where: { id: uid },
      relations: ['role'],
      select: ['id', 'username', 'email', 'phone', 'fullName', 'role', 'createdProjects']
    });
    if (!user) {
      throw new BadRequestException('User not found');
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
}
