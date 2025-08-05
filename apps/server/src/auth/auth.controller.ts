import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt.guard';
import { ForRoles, IsPublicEndpoint } from '#LocalProject/Auth/decorators';
import { RolesGuard } from './guards/role.guard';
import { LoginDto } from '#LocalProject/Dtos';
import { UserRole } from '#LocalProject/Entities';
import type { AuthenticatedRequest } from './types';
import type { Request } from 'express';
import { logger } from 'nx/src/utils/logger';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @IsPublicEndpoint()
  @Post('login')
  async login(@Body() body: LoginDto) {
    const result = await this.authService.login(body.username, body.password);

    return {
      user: result.user,
      token: result.accessToken,
      refreshToken: result.refreshToken,
      message: 'Login successful',
    };
  }

  @IsPublicEndpoint()
  @Post('google')
  async loginWithGoogle(@Body('idToken') idToken: string) {
    const { accessToken, refreshToken, user } = await this.authService.loginWithGoogle(
      idToken
    );
    logger.log(idToken);
    logger.log(user);
    return { user, token: accessToken, refreshToken };
  }

  @IsPublicEndpoint()
  @Post('refresh')
  async refreshTokens(@Req() req: Request) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('No valid token provided');
    }

    const token = authHeader.substring(7);
    const { accessToken, refreshToken, user } = await this.authService.refreshTokens(token);

    return { user, token: accessToken, refreshToken };
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
  async logout(@Req() req: Request) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      await this.authService.logout(token);
    }

    return { message: 'Logged out successfully' };
  }

  @Post('forgot-password')
  @IsPublicEndpoint()
  forgotPassword(@Body('email') email: string) {
    return this.authService.sendResetCode(email);
  }

  @Post('verify-code')
  @IsPublicEndpoint()
  verifyCode(@Body() body: { email: string; code: string }) {
    return this.authService.verifyResetCode(body.email, body.code);
  }

  @Post('reset-password')
  @IsPublicEndpoint()
  resetPassword(
    @Body() body: { email: string; code: string; newPassword: string }
  ) {
    return this.authService.resetPassword(
      body.email,
      body.code,
      body.newPassword
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getCurrentUser(@Req() req: Request) {
    try {
      console.log('Headers in /me endpoint:', req.headers);
      const user = (req as any).user;
      console.log('User from request:', user);

      if (!user) {
        throw new UnauthorizedException('User not found in request');
      }

      return user;
    } catch (error) {
      console.error('Error in /me endpoint:', error);
      throw error;
    }
  }

  @Get('debug')
  @IsPublicEndpoint()
  async debugAuth(@Req() req: Request) {
    const authHeader = req.headers.authorization;

    return {
      hasAuthHeader: !!authHeader,
      authHeaderValue: authHeader ? authHeader.substring(0, 20) + '...' : null,
      userAgent: req.headers['user-agent'],
    };
  }

  @Get('test-auth')
  @IsPublicEndpoint()
  async testAuth(@Req() req: Request) {
    const authHeader = req.headers.authorization;

    return {
      hasAuthHeader: !!authHeader,
      authHeaderValue: authHeader ? authHeader.substring(0, 20) + '...' : null,
      userAgent: req.headers['user-agent'],
      host: req.headers.host,
      origin: req.headers.origin,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('test-jwt')
  async testJwt(@Req() req: Request) {
    return {
      message: 'JWT authentication successful',
      user: (req as any).user,
      headers: {
        authorization: req.headers.authorization ? 'present' : 'missing',
      },
    };
  }

  @Get('test-token')
  @IsPublicEndpoint()
  async testToken(@Req() req: Request) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return { error: 'No token provided' };
    }

    try {
      const user = await this.authService.validateToken(token);
      return {
        success: true,
        user,
        message: 'Token is valid',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        message: 'Token validation failed',
      };
    }
  }

  @Get('ping')
  @IsPublicEndpoint()
  ping(@Req() req: Request) {
    return {
      message: 'pong',
      method: req.method,
      origin: req.headers.origin || null,
      referer: req.headers.referer || null,
      receivedHeaders: req.headers,
    };
  }
}
