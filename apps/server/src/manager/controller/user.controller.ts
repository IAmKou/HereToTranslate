import { BadRequestException, Body, Controller, Get, Post, Put, Req, UseGuards } from "@nestjs/common";
import { RegisterDto } from "#LocalProject/Dtos";
import { IsPublicEndpoint } from "#LocalProject/Auth/decorators";
import { JwtAuthGuard } from "#LocalProject/Auth/guards/jwt.guard";
import type { AuthenticatedRequest } from "#LocalProject/Auth/types";
import { UserManagerService } from "../service/user-manager.service";

@Controller('user')
export class UserController {
  constructor(private readonly users: UserManagerService) {}
  @IsPublicEndpoint()
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.users.register(dto);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  getUser(@Body('id') id: bigint, @Req() request: AuthenticatedRequest) {
    return this.users.getUser(id);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  updateUser(@Body('id') id: bigint, @Body() userUpdateData: RegisterDto, @Req() request: AuthenticatedRequest) {
    if (request.user.id !== id) {
      throw new BadRequestException("You can only update your own user data.");
    }
    return this.users.update(id, userUpdateData);
  }
}
