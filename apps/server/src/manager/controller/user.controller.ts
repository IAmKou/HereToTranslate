import { ArgumentMetadata, BadRequestException, Body, Controller, Get, Param, PipeTransform, Post, Put, Req, UseGuards } from "@nestjs/common";
import { RegisterDto, UpdateProfileDto } from "#LocalProject/Dtos";
import { IsPublicEndpoint } from "#LocalProject/Auth/decorators";
import { JwtAuthGuard } from "#LocalProject/Auth/guards/jwt.guard";
import type { AuthenticatedRequest } from "#LocalProject/Auth/types";
import { UserManagerService } from "../service/user-manager.service";
import { UpdateUserRoleDto } from "src/dto/update-user-role.dto";
import { RolesGuard } from "#LocalProject/Auth/guards/role.guard";
import { UserEntity } from "#LocalProject/Entities";

class ParseBigIntPipe implements PipeTransform<string, bigint> {
  transform(value: string, metadata: ArgumentMetadata): bigint {
    try {
      return BigInt(value);
    } catch (error) {
      throw new BadRequestException('Invalid bigint value');
    }
  }
}

interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

@Controller('user')
export class UserController {
  constructor(private readonly users: UserManagerService) {}
  @IsPublicEndpoint()
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.users.register(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('profile')
  async getProfile(@Req() req: AuthenticatedRequest) {
    return this.users.getUserProfile(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Put('update')
  async updateProfile(
    @Req() req: AuthenticatedRequest,
    @Body() updateProfileDto: UpdateProfileDto
  ) {
    return this.users.updateProfile(req.user.id, updateProfileDto);
  }

  @UseGuards(JwtAuthGuard)
  @Put('change-password')
  async changePassword(
    @Req() req: AuthenticatedRequest,
    @Body() changePasswordDto: ChangePasswordDto
  ) {
    return this.users.changePassword(
      req.user.id,
      changePasswordDto.currentPassword,
      changePasswordDto.newPassword
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('admin/all')
  async getAllUsers() {
    return this.users.getAllUsers();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Put('admin/:id/role')
  async updateUserRole(
    @Param('id', ParseBigIntPipe) userId: bigint,
    @Body() updateRoleDto: UpdateUserRoleDto,
    @Req() req: AuthenticatedRequest
  ) {
    return this.users.updateUserRole(userId, updateRoleDto, req.user as UserEntity);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Put('admin/:id/toggle-status')
  async toggleUserStatus(
    @Param('id', ParseBigIntPipe) userId: bigint
  ) {
    return this.users.toggleUserStatus(userId);
  }
}
