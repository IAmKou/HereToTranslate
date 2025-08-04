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
    const result = await this.authService.login(
      body.username,
      body.password
    );

    console.log('Login successful, setting cookies...');
    console.log('NODE_ENV:', process.env.NODE_ENV);
    console.log('Access token length:', result.accessToken.length);

    res.cookie('access_token', result.accessToken, {
      httpOnly: true,
      secure: false, 
      sameSite: 'lax',
      path: '/',
      expires: this.authService.getExpiryDate(
        this.configService.get('ACCESS_TOKEN_EXPIRY') || '15m'
      ),
    });

    res.cookie('refresh_token', result.refreshToken, {
      httpOnly: true,
      secure: false, 
      sameSite: 'lax',
      path: '/',
      expires: this.authService.getExpiryDate(
        this.configService.get('REFRESH_TOKEN_EXPIRY') || '7d'
      ),
    });

    console.log('Cookies set successfully');
    const response = { 
      user: result.user,
      token: result.accessToken, 
      message: 'Login successful - check cookies'
    };
    console.log('Response being sent:', JSON.stringify(response, null, 2));
    return res.json(response);
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
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 1000 * 60 * 15, // 15 mins
    });

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
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
      return res.status(401).json({ message: 'Refresh token not found' });
    }

    const {
      accessToken,
      refreshToken: newRefreshToken,
      user,
    } = await this.authService.refreshTokens(refreshToken);

    // Set new access token cookie
    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: this.authService.getExpiryDate(
        this.configService.get('ACCESS_TOKEN_EXPIRY') || '15m'
      ),
    });

    // Set new refresh token cookie
    res.cookie('refresh_token', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      expires: this.authService.getExpiryDate(
        this.configService.get('REFRESH_TOKEN_EXPIRY') || '7d'
      ),
    });

    return res.json({ user });
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
    res.clearCookie('access_token');
    res.clearCookie('refresh_token');
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');

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
    try {
      console.log('Cookies in /me endpoint:', req.cookies);
      console.log('Headers in /me endpoint:', req.headers);
      
      // The JWT guard should have already validated the token
      // and attached the user to the request
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
    const token = req.cookies?.access_token;
    const authHeader = req.headers.authorization;

    return {
      hasCookie: !!token,
      hasAuthHeader: !!authHeader,
      cookieValue: token ? token.substring(0, 20) + '...' : null,
      authHeaderValue: authHeader ? authHeader.substring(0, 20) + '...' : null,
      allCookies: req.cookies,
      userAgent: req.headers['user-agent']
    };
  }

  @Get('db-status')
  @IsPublicEndpoint()
  async checkDatabaseStatus() {
    try {
      // Check if auth_tokens table exists and has data
      const tokenCount = await this.authService.authRepository.count();

      return {
        status: 'OK',
        authTokensCount: tokenCount,
        message: 'Database connection successful'
      };
    } catch (error) {
      return {
        status: 'ERROR',
        error: error instanceof Error ? error.message : String(error),
        message: 'Database connection failed'
      };
    }
  }

  @Get('test-auth')
  @IsPublicEndpoint()
  async testAuth(@Req() req: Request) {
    const token = req.cookies?.access_token;
    const authHeader = req.headers.authorization;

    return {
      hasCookie: !!token,
      hasAuthHeader: !!authHeader,
      cookieValue: token ? token.substring(0, 20) + '...' : null,
      authHeaderValue: authHeader ? authHeader.substring(0, 20) + '...' : null,
      allCookies: req.cookies,
      userAgent: req.headers['user-agent'],
      host: req.headers.host,
      origin: req.headers.origin
    };
  }

  @Get('test-cookies')
  @IsPublicEndpoint()
  async testCookies(@Req() req: Request, @Res() res: Response) {
    // Set a test cookie
    res.cookie('test_cookie', 'test_value', {
      httpOnly: false, // Make it accessible to JavaScript for testing
      secure: false,
      sameSite: 'lax',
      path: '/',
    });

    return {
      message: 'Test cookie set',
      existingCookies: req.cookies,
      headers: {
        cookie: req.headers.cookie || 'none'
      }
    };
  }

  @Get('test-session')
  @IsPublicEndpoint()
  async testSession(@Req() req: Request, @Res() res: Response) {
    console.log('=== SESSION TEST ===');
    console.log('All headers:', JSON.stringify(req.headers, null, 2));
    console.log('Cookies:', req.cookies);
    console.log('Cookie header:', req.headers.cookie);
    
    // Set a session cookie
    res.cookie('session_test', 'session_value', {
      httpOnly: false,
      secure: false,
      sameSite: 'lax',
      path: '/',
    });

    return {
      message: 'Session test',
      cookies: req.cookies,
      cookieHeader: req.headers.cookie || 'none',
      allHeaders: Object.keys(req.headers)
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('test-jwt')
  async testJwt(@Req() req: Request) {
    return {
      message: 'JWT authentication successful',
      user: (req as any).user,
      cookies: req.cookies,
      headers: {
        authorization: req.headers.authorization ? 'present' : 'missing',
        cookie: req.headers.cookie ? 'present' : 'missing'
      }
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
        message: 'Token is valid'
      };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error),
        message: 'Token validation failed'
      };
    }
  }
}
