import { Controller, Get, Req, UseGuards, Put, Body, Param, PipeTransform, ArgumentMetadata, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { UsersService } from './users.service';
import { Request } from 'express';
import { RolesGuard } from '../auth/role.guard';
import { UpdateUserRoleDto } from '../dto/update-user-role.dto';

class ParseBigIntPipe implements PipeTransform<string, bigint> {
  transform(value: string, metadata: ArgumentMetadata): bigint {
    try {
      return BigInt(value);
    } catch (error) {
      throw new BadRequestException('Invalid bigint value');
    }
  }
}

interface AuthenticatedRequest extends Request {
  user: {
    id: bigint;
    username: string;
    role: string;
  };
}

interface UpdateProfileDto {
  fullName?: string;
  phone?: string;
}

interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@Req() req: AuthenticatedRequest) {
    return this.usersService.getUserProfile(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Put('profile')
  async updateProfile(
    @Req() req: AuthenticatedRequest,
    @Body() updateProfileDto: UpdateProfileDto
  ) {
    return this.usersService.updateProfile(req.user.id, updateProfileDto);
  }

  @UseGuards(JwtAuthGuard)
  @Put('change-password')
  async changePassword(
    @Req() req: AuthenticatedRequest,
    @Body() changePasswordDto: ChangePasswordDto
  ) {
    return this.usersService.changePassword(
      req.user.id,
      changePasswordDto.currentPassword,
      changePasswordDto.newPassword
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('admin/all')
  async getAllUsers() {
    return this.usersService.getAllUsers();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Put('admin/:id/role')
  async updateUserRole(
    @Param('id', ParseBigIntPipe) userId: bigint,
    @Body() updateRoleDto: UpdateUserRoleDto
  ) {
    return this.usersService.updateUserRole(userId, updateRoleDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Put('admin/:id/toggle-status')
  async toggleUserStatus(
    @Param('id', ParseBigIntPipe) userId: bigint
  ) {
    return this.usersService.toggleUserStatus(userId);
  }
}
