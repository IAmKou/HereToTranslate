import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
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
import type { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { logger } from 'nx/src/utils/logger';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService
  ) {}

  @IsPublicEndpoint()
  @Post('login')
  async login(@Body() body: LoginDto, @Res() res: Response) {
    const { accessToken, refreshToken, user } = await this.authService.login(
      body.username,
      body.password
    );

    // Set access token cookie
    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'strict',
      expires: this.authService.getExpiryDate(
        this.configService.get('ACCESS_TOKEN_EXPIRY') || '15m'
      ),
    });

    // Set refresh token cookie similarly
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'strict',
      expires: this.authService.getExpiryDate(
        this.configService.get('REFRESH_TOKEN_EXPIRY') || '7d'
      ),
    });

    return res.json({ user });
  }

  @IsPublicEndpoint()
  @Post('google')
  async loginWithGoogle(
    @Body('idToken') idToken: string,
    @Res({ passthrough: true }) res: Response
  ) {
    const { accessToken, refreshToken, user } =
      await this.authService.loginWithGoogle(idToken);
    logger.log(idToken);
    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'strict',
      maxAge: 1000 * 60 * 15, // 15 mins
    });

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'strict',
      maxAge: 1000 * 60 * 60 * 24 * 7,
    });
    logger.log(user);
    return { user };
  }

  @IsPublicEndpoint()
  @Post('refresh')
  async refreshTokens(@Req() req: Request, @Res() res: Response) {
    const refreshToken = req.cookies?.refresh_token;
    if (!refreshToken) {
      res.clearCookie('access_token', { secure: false, sameSite: 'strict' });
      res.clearCookie('refresh_token', { secure: false, sameSite: 'strict' });
      return res.status(401).json({ message: 'Refresh token not found' });
    }

    try {
      const {
        accessToken,
        refreshToken: newRefreshToken,
        user,
      } = await this.authService.refreshTokens(refreshToken);

      // Set new access token cookie
      res.cookie('access_token', accessToken, {
        httpOnly: true,
        secure: false,
        sameSite: 'strict',
        expires: this.authService.getExpiryDate(
          this.configService.get('ACCESS_TOKEN_EXPIRY') || '15m'
        ),
      });

      // Set new refresh token cookie
      res.cookie('refresh_token', newRefreshToken, {
        httpOnly: true,
        secure: false,
        sameSite: 'strict',
        expires: this.authService.getExpiryDate(
          this.configService.get('REFRESH_TOKEN_EXPIRY') || '7d'
        ),
      });

      return res.json({ user });
    } catch (error) {
      // Clear invalid cookies on any error
      res.clearCookie('access_token', { secure: false, sameSite: 'strict' });
      res.clearCookie('refresh_token', { secure: false, sameSite: 'strict' });
      return res.status(401).json({ message: 'Invalid refresh token' });
    }
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
  async logout(@Req() req: Request, @Res() res: Response) {
    const accessToken = req.cookies?.access_token;
    // const refreshToken = req.cookies?.refresh_token;

    if (accessToken) {
      await this.authService.logout(accessToken);
    }
    //multi session logout
    // if (refreshToken) {
    //   await this.authRepository.delete({ refreshToken });
    // }

    // Clear both old and new cookie names for backward compatibility
    res.clearCookie('access_token', {
      secure: false,
      sameSite: 'none'
    });
    res.clearCookie('refresh_token', {
      secure: false,
      sameSite: 'none'
    });

    return res.json({ message: 'Logged out successfully' });
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
    const token = req.cookies?.access_token;
    if (!token) {
      throw new UnauthorizedException('No access token found');
    }

    return await this.authService.validateToken(token);
  }

  @IsPublicEndpoint()
  @Get('clear-cookies')
  @Post('clear-cookies')
  async clearAllCookies(@Res() res: Response) {
    // Clear all possible cookie variations
    res.clearCookie('access_token', { secure: false, sameSite: 'strict' });
    res.clearCookie('refresh_token', { secure: false, sameSite: 'strict' });


    return res.json({ message: 'All cookies cleared' });
  }
}
