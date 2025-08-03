import {
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
  ValidationPipe,
  Query,
  NotFoundException,
  UploadedFile
} from '@nestjs/common';
import {
  RegisterDto,
  UpdateUserPasswordDto,
  UpdateUserProfileDto,
} from '#LocalProject/Dtos';
import { IsPublicEndpoint } from '#LocalProject/Auth/decorators';
import { JwtAuthGuard } from '#LocalProject/Auth/guards/jwt.guard';
import type { AuthenticatedRequest } from '#LocalProject/Auth/types';
import { UserManagerService } from '../service/user-manager.service';
import { BigIntTransformPipe } from '#LocalProject/Utils/pipes/bigint-transform.pipe';
import { JsonSerializerInterceptor } from '#LocalProject/Utils/json-serializer.interceptor';
import { RolesGuard } from '#LocalProject/Auth/guards/role.guard';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { join } from 'path';

@Controller('users')
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
    const result = this.users.getUserProfile(request.user.id);
    console.log('[GET PROFILE]', { userId: request.user.id, result });
    return result;
  }

  @Put('update')
  @UseGuards(JwtAuthGuard)
  updateProfile(
    @Body(ValidationPipe) userUpdateData: UpdateUserProfileDto,
    @Req() request: AuthenticatedRequest
  ) {

    return this.users.updateProfile(request.user.id, userUpdateData);
  }

  @Patch('/change-password')
  async changePassword(
    @Req() request: AuthenticatedRequest,
    @Body() dto: UpdateUserPasswordDto
  ) {
    await this.users.changePassword(request.user.id, dto);
  }

  @Post('avatar')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('avatar', {
    storage: diskStorage({
      destination: join(process.cwd(), 'apps/server/uploads/avatars'),
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, uniqueSuffix + extname(file.originalname));
      }
    }),
    fileFilter: (req, file, cb) => {
      if (!file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
        cb(new Error('Only image files are allowed!'), false);
      } else {
        cb(null, true);
      }
    },
    limits: { fileSize: 2 * 1024 * 1024 },
  }))

  async uploadAvatar(@UploadedFile() file: Express.Multer.File, @Req() req: AuthenticatedRequest) {
    const avatarUrl = `/uploads/avatars/${file.filename}`;
    console.log('[UPLOAD AVATAR]', { userId: req.user.id, avatarUrl, file });
    await this.users.updateAvatar(req.user.id, avatarUrl);
    return { avatarUrl };
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
    return this.users.updateUserRole(userId, roleId, req);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Put('admin/:id/toggle-status')
  async toggleUserStatus(@Param('id', BigIntTransformPipe) userId: bigint) {
    return this.users.toggleUserStatus(userId);
  }
  @UseGuards(JwtAuthGuard)
  @Get('search')
  async searchUser(@Query('identifier') identifier: string) {
    const users = await this.users.searchUsers(identifier);
    if (!users || users.length === 0) {
      throw new NotFoundException('User not found');
    }
    return users[0];
  }
}
