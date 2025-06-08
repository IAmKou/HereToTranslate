import { Controller, Get, Put, Body, UseGuards, Req, HttpException, HttpStatus } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity } from '../db/mysql/entity/user.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UserService } from './user.service';
import { Request } from 'express';

interface AuthenticatedRequest extends Request {
    user: UserEntity;
}

@Controller('users')
export class UserController {
    constructor(
        @InjectRepository(UserEntity)
        private userRepository: Repository<UserEntity>,
        private userService: UserService,
    ) { }

    @Get()
    async findAll() {
        const users = await this.userRepository.find({
            select: ['id', 'username', 'fullName', 'email', 'phone'],
            where: { isActive: true }
        });
        return users;
    }
    //   @UseGuards(JwtAuthGuard)
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