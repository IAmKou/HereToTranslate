import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from './auth.service';
import { Request } from 'express';

const cookieExtractor = (req: Request) => {
  // Try both cookie names for compatibility
  return req?.cookies?.access_token || req?.cookies?.accessToken || null;
};

const headerExtractor = (req: Request) => {
  if (req?.headers?.authorization) {
    const authHeader = req.headers.authorization;
    if (authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }
  }
  return null;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(private readonly authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        // Try Authorization header first (most reliable for cross-domain)
        headerExtractor,
        // Then try cookies as fallback
        cookieExtractor,
        // Also try the standard bearer token extractor
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      secretOrKey: process.env.JWT_SECRET ?? 'secret',
      passReqToCallback: true,
      ignoreExpiration: false,
    });
  }

  async validate(req: Request, payload: any): Promise<any> {
    this.logger.log(
      `JWT Strategy validate called with payload sub: ${
        payload?.sub || 'undefined'
      }`
    );
    this.logger.log(
      `JWT Strategy payload userId: ${payload?.userId || 'undefined'}`
    );
    this.logger.log(
      `JWT Strategy payload username: ${payload?.username || 'undefined'}`
    );

    // Try to extract token from multiple sources
    const tokenFromHeader = headerExtractor(req);
    const tokenFromCookie = cookieExtractor(req);
    const token = tokenFromHeader || tokenFromCookie;

    this.logger.log(
      `Token from header: ${
        tokenFromHeader ? tokenFromHeader.substring(0, 20) + '...' : 'null'
      }`
    );
    this.logger.log(
      `Token from cookie: ${
        tokenFromCookie ? tokenFromCookie.substring(0, 20) + '...' : 'null'
      }`
    );
    this.logger.log(
      `Final token: ${token ? token.substring(0, 20) + '...' : 'null'}`
    );
    this.logger.log(
      `Authorization header: ${req?.headers?.authorization || 'none'}`
    );
    this.logger.log(`Cookies: ${JSON.stringify(req?.cookies || {})}`);

    if (!token) {
      this.logger.warn('No token provided in request');
      throw new UnauthorizedException('No token provided');
    }

    try {
      // Validate the token with your auth service
      const user = await this.authService.validateToken(token);

      if (!user) {
        this.logger.warn('Token validation returned no user');
        throw new UnauthorizedException('Invalid token - no user found');
      }

      this.logger.log(
        `Token validation successful for user: ${user.username} (ID: ${user.id})`
      );
      this.logger.log(`User role:  (ID: ${user.role || 'undefined'})`);

      return user;
    } catch (error) {
      this.logger.error(
        `Token validation failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      this.logger.error(
        `Error stack: ${error instanceof Error ? error.stack : ''}`
      );
      throw new UnauthorizedException('Invalid token');
    }
  }
}
