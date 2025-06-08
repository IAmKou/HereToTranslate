import { Controller, Get, Put, Body, UseGuards, Req, HttpException, HttpStatus, Param } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../db/mysql/entity/user.entity';
import { RoleEntity } from '../db/mysql/entity/role.entity';
import { UserService } from './user.service';
import { Request } from 'express';
import { Roles } from '../auth/role.decorator';
import { RolesGuard } from '../auth/role.guard';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

interface AuthenticatedRequest extends Request {
    user: {
        id: bigint;
        username: string;
        role: string;
    };
}

@Controller('users')
export class UserController {
    constructor(
        @InjectRepository(UserEntity)
        private userRepository: Repository<UserEntity>,
        @InjectRepository(RoleEntity)
        private roleRepository: Repository<RoleEntity>,
        private userService: UserService,
    ) { }

    // Get all users (admin only)
    // @UseGuards(JwtAuthGuard, RolesGuard)
    // @Roles('admin')
    @Get()
    async findAll() {
        const users = await this.userRepository.find({
            select: ['id', 'username', 'fullName', 'email', 'phone', 'isActive', 'createdAt'],
            relations: ['role'],
        });
        return users.map(user => {
            const { passwordHash, ...result } = user;
            return result;
        });
    }

    // Get a specific user by ID (admin only)
    // @UseGuards(JwtAuthGuard, RolesGuard)
    // @Roles('admin')
    @Get(':id')
    async findOne(@Param('id') id: string) {
        const user = await this.userRepository.findOne({
            where: { id: BigInt(id) },
            relations: ['role'],
        });

        if (!user) {
            throw new HttpException('User not found', HttpStatus.NOT_FOUND);
        }

        const { passwordHash, ...result } = user;
        return result;
    }

    // Update user role (admin only)
    // @UseGuards(JwtAuthGuard, RolesGuard)
    // @Roles('admin')
    @Put(':id/role')
    async updateRole(@Param('id') id: string, @Body() data: { roleId: number }) {
        return this.userService.updateRole(id, data.roleId);
    }

    @Get('profile')
    async getProfile(@Req() req: AuthenticatedRequest) {
        const userId = req.user.id;
        const user = await this.userRepository.findOne({
            where: { id: userId },
            relations: ['role'],
        });

        if (!user) {
            throw new HttpException('User not found', HttpStatus.NOT_FOUND);
        }

        // Remove sensitive information
        const { passwordHash, ...result } = user;
        return result;
    }

    @UseGuards(JwtAuthGuard)
    @Put('profile')
    async updateProfile(
        @Req() req: AuthenticatedRequest,
        @Body() updateProfileDto: UpdateProfileDto,
    ) {
        return this.userService.updateProfile(req.user.id, updateProfileDto);
    }

    @UseGuards(JwtAuthGuard)
    @Put('change-password')
    async changePassword(
        @Req() req: AuthenticatedRequest,
        @Body() changePasswordDto: ChangePasswordDto,
    ) {
        return this.userService.changePassword(
            req.user.id,
            changePasswordDto,
        );
    }
}