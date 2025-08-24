import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Req,
  Res,
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
import { diskStorage, memoryStorage } from 'multer';
import { extname } from 'path';

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
  @UseGuards(JwtAuthGuard)
  async changePassword(
    @Req() request: AuthenticatedRequest,
    @Body() dto: UpdateUserPasswordDto
  ) {
    await this.users.changePassword(request.user.id, dto);
  }

  @Post('avatar')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('avatar', {
    storage: memoryStorage(), // Sử dụng memory storage để có buffer
    fileFilter: (req, file, cb) => {
      if (!file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
        cb(new Error('Only image files are allowed!'), false);
      } else {
        cb(null, true);
      }
    },
    limits: { fileSize: 2 * 1024 * 1024 },
  }))
  async uploadAvatar(@UploadedFile() file: Express.Multer.File, @Req() req) {
    // Tạo filename unique
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const filename = uniqueSuffix + extname(file.originalname);
    const avatarUrl = `/uploads/avatars/${filename}`;

    console.log('[UPLOAD AVATAR]', { userId: req.user.id, avatarUrl, file });

    try {
      // Chỉ lưu vào database, không lưu vào disk
      await this.users.updateAvatarWithData(req.user.id, avatarUrl, file.buffer, file.mimetype);

      console.log('[UPLOAD AVATAR] File saved to database only');

      return { avatarUrl };
    } catch (error) {
      console.error('[UPLOAD AVATAR] Error:', error);
      throw error;
    }
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('admin/all')
  async getAllUsers() {
    return this.users.getAllUsers();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('admin/:id')
  async getUserById(@Param('id', BigIntTransformPipe) userId: bigint) {
    return this.users.findUserById(Number(userId));
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

  @Get('avatar/:userId')
  async getUserAvatar(@Param('userId', BigIntTransformPipe) userId: bigint, @Res() res) {
    const user = await this.users.findUserById(Number(userId));
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const userWithAvatar = await this.users.getUserWithAvatar(Number(userId));
    if (!userWithAvatar || !userWithAvatar.avatarData) {
      // Trả về default avatar hoặc 404
      return res.status(404).send('Avatar not found');
    }

    res.set({
      'Content-Type': userWithAvatar.avatarMimeType || 'image/jpeg',
      'Content-Length': userWithAvatar.avatarData.length,
      'Cache-Control': 'public, max-age=31536000', // Cache 1 năm
    });
    res.send(userWithAvatar.avatarData);
  }

  // Endpoint để serve avatar từ database theo URL path
  @Get('uploads/avatars/:filename')
  async getAvatarByFilename(@Param('filename') filename: string, @Res() res) {
    console.log('[GET AVATAR BY FILENAME]', filename);

    // Tìm user có avatarUrl match với filename
    const user = await this.users.findUserByAvatarFilename(filename);
    if (!user) {
      console.log('[GET AVATAR BY FILENAME] User not found for filename:', filename);
      return res.status(404).send('Avatar not found');
    }

    const userWithAvatar = await this.users.getUserWithAvatar(Number(user.id));
    if (!userWithAvatar || !userWithAvatar.avatarData) {
      console.log('[GET AVATAR BY FILENAME] Avatar data not found for user:', user.id);
      return res.status(404).send('Avatar not found');
    }

    console.log('[GET AVATAR BY FILENAME] Serving avatar for user:', user.id, 'size:', userWithAvatar.avatarData.length);

    res.set({
      'Content-Type': userWithAvatar.avatarMimeType || 'image/jpeg',
      'Content-Length': userWithAvatar.avatarData.length,
      'Cache-Control': 'public, max-age=31536000', // Cache 1 năm
    });
    res.send(userWithAvatar.avatarData);
  }
}
