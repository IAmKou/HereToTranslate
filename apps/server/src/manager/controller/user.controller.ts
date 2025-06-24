import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
  UseInterceptors,
  ValidationPipe
} from '@nestjs/common';
import { RegisterDto, UpdateUserDto, UpdateUserProfileDto } from '#LocalProject/Dtos';
import { IsPublicEndpoint } from "#LocalProject/Auth/decorators";
import { JwtAuthGuard } from "#LocalProject/Auth/guards/jwt.guard";
import type { AuthenticatedRequest } from "#LocalProject/Auth/types";
import { UserManagerService } from "../service/user-manager.service";
import { BigIntTransformPipe } from "#LocalProject/Utils/pipes/bigint-transform.pipe";
import { JsonSerializerInterceptor } from "#LocalProject/Utils/json-serializer.interceptor";

@Controller('users')
@UseInterceptors(JsonSerializerInterceptor)
export class UserController {
  constructor(private readonly users: UserManagerService) {}
  @IsPublicEndpoint()
  @Post('register')
  register(@Body(ValidationPipe) dto: RegisterDto) {
    return this.users.register(dto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  getMe(@Req() request: AuthenticatedRequest) {
    return this.users.getUserProfile(request.user.id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  getUser(
    @Param('id', BigIntTransformPipe) id: bigint,
    @Req() request: AuthenticatedRequest
  ) {
    return this.users.getUserProfile(id);
  }

  @Put(':id/profile')
  @UseGuards(JwtAuthGuard)
  updateProfile(
    @Body('id', BigIntTransformPipe) id: bigint,
    @Body(ValidationPipe) userUpdateData: UpdateUserProfileDto,
    @Req() request: AuthenticatedRequest
  ) {
    if (request.user.id !== id) {
      throw new BadRequestException("You can only update your own user data.");
    }
    return this.users.updateProfile(id, userUpdateData);
  }
}
