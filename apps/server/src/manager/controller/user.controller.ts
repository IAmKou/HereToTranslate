import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Req,
  Patch,
  UseGuards,
  UseInterceptors,
  ValidationPipe
} from '@nestjs/common';
import { ChangePasswordDto, RegisterDto, UpdateUserDto } from '#LocalProject/Dtos';
import { IsPublicEndpoint } from "#LocalProject/Auth/decorators";
import { JwtAuthGuard } from "#LocalProject/Auth/guards/jwt.guard";
import type { AuthenticatedRequest } from "#LocalProject/Auth/types";
import { UserManagerService } from "../service/user-manager.service";
import { BigIntTransformPipe } from "#LocalProject/Utils/pipes/bigint-transform.pipe";
import { JsonSerializerInterceptor } from "#LocalProject/Utils/json-serializer.interceptor";
import { RolesGuard } from '#LocalProject/Auth/guards/role.guard';
import { UserEntity } from '#LocalProject/Entities';
import { logger } from 'nx/src/utils/logger';

@Controller('user')
@UseInterceptors(JsonSerializerInterceptor)
export class UserController {
  constructor(private readonly users: UserManagerService) {}
  @IsPublicEndpoint()
  @Post('register')
  register(@Body(ValidationPipe) dto: RegisterDto) {
    return this.users.register(dto);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  getProfile(@Req() request: AuthenticatedRequest) {
    return this.users.getUser(request.user.id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  getUser(
    @Param('id', BigIntTransformPipe) id: bigint,
    @Req() request: AuthenticatedRequest
  ) {
    return this.users.getUser(id);
  }

  @Put('/:id/update')
  @UseGuards(JwtAuthGuard)
  updateUser(
    @Param('id', BigIntTransformPipe) id: bigint,
    @Body(ValidationPipe) userUpdateData: UpdateUserDto,
    @Req() request: AuthenticatedRequest
  ) {
    const  uid = request.user.id;
    logger.log(uid.toString());
    logger.log(id.toString());
    if (uid.toString() !== id.toString()) {
      throw new BadRequestException("You can only update your own user data.");
    }
    return this.users.update(id, userUpdateData);
  }

  @Patch('/:id/change-password')
  async changePassword(
    @Param('id', BigIntTransformPipe) id: bigint,
    @Req() request: AuthenticatedRequest,
    @Body() dto: ChangePasswordDto
  ) {
    await this.users.changePassword(id, dto.currentPassword, dto.newPassword);
  }


  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('admin/all')
  async getAllUsers() {
    return this.users.getAllUsers();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Put('admin/:id/role/:rid')
  async updateUserRole(
    @Param('id', BigIntTransformPipe) userId: bigint,
    @Param('rid') roleId: number,
    @Req() req: AuthenticatedRequest
  ) {
    return this.users.updateUserRole(userId, roleId, req.user as UserEntity);
  }


  @UseGuards(JwtAuthGuard, RolesGuard)
  @Put('admin/:id/toggle-status')
  async toggleUserStatus(
    @Param('id', BigIntTransformPipe) userId: bigint
  ) {
    return this.users.toggleUserStatus(userId);
  }
}
