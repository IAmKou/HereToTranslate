import { Controller, Post, Body, UseGuards, Get, Req, } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt.guard';
import { ForRoles, IsPublicEndpoint } from '#LocalProject/Auth/decorators';
import { RolesGuard } from './guards/role.guard'
import { LoginDto } from '#LocalProject/Dtos';
import { UserRole } from '#LocalProject/Entities';
import type { AuthenticatedRequest } from './types';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @IsPublicEndpoint()
  @Post('login')
  login(@Body() body: LoginDto) {
    return this.authService.login(body.username, body.password);
  }

  @IsPublicEndpoint()
  @Post('google')
  async loginWithGoogle(@Body('idToken') idToken: string) {
    return this.authService.loginWithGoogle(idToken);
  }

  @IsPublicEndpoint()
  @Post('refresh')
  async refreshTokens(@Body('refreshToken') refreshToken: string) {
    return this.authService.refreshTokens(refreshToken);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @ForRoles(UserRole.Admin)
  @Get('admin-home')
  getAdminHome(@Req() req: AuthenticatedRequest) {
    return `Welcome, ${req.user.username} (ADMIN)`;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @ForRoles(UserRole.Member)
  @Get('user-home')
  getStudentHome(@Req() req: AuthenticatedRequest) {
    return `Welcome, ${req.user.username} (MEMBER)`;
  }

  @UseGuards(JwtAuthGuard)
  @Post('logout')
  async logout(@Body('refreshToken') refreshToken: string) {
    return this.authService.logout(refreshToken);
  }
}
