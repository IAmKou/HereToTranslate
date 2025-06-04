import { Controller, Post, Body, UseGuards, Get, Req, } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from '../db/dto/register.dto';
import { JwtAuthGuard } from './jwt.guard';
import { Roles } from './role.decorator';
import { RolesGuard } from './role.guard'
import { Request } from 'express';

interface AuthenticatedRequest extends Request {
  user: {
    username: string;
    role: string;
  };
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  login(@Body() body: any) {
    return this.authService.login(body.username, body.password);
  }

  @Post('google')
  async loginWithGoogle(@Body('idToken') idToken: string) {
    return this.authService.loginWithGoogle(idToken);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  @Get('admin-home')
  getAdminHome(@Req() req: AuthenticatedRequest) {
    return `Welcome, ${req.user.username} (ADMIN)`;
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('member')
  @Get('user-home')
  getStudentHome(@Req() req: AuthenticatedRequest) {
    return `Welcome, ${req.user.username} (MEMBER)`;
  }
}
