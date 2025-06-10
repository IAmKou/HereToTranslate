import { Controller, Post, Body, UseGuards, Get, Req, } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from '../db/dto/register.dto';
import { JwtAuthGuard } from './jwt.guard';
import { Roles } from './role.decorator';
import { RolesGuard } from './role.guard'
import { Request } from 'express';
import { Public } from './public.decorator';
import { UserRole } from '../db/mysql/entity/user.entity';

interface AuthenticatedRequest extends Request {
  user: {
    username: string;
    role: string;
  };
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  login(@Body() body: any) {
    return this.authService.login(body.username, body.password);
  }

  @Public()
  @Post('google')
  async loginWithGoogle(@Body('idToken') idToken: string) {
    return this.authService.loginWithGoogle(idToken);
  }

  @Public()
  @Post('refresh')
  async refreshTokens(@Body('refreshToken') refreshToken: string) {
    return this.authService.refreshTokens(refreshToken);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.Admin)
  @Get('admin-home')
  getAdminHome(@Req() req: AuthenticatedRequest) {
    return `Welcome, ${req.user.username} (ADMIN)`;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.User)
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
