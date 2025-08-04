import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from './auth.service';
import { Request } from 'express';

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
        // Use Authorization header (most reliable for SPA)
        headerExtractor,
        // Also try the standard bearer token extractor as fallback
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

    // Extract token from Authorization header
    const token = headerExtractor(req);

    this.logger.log(
      `Token from header: ${
        token ? token.substring(0, 20) + '...' : 'null'
      }`
    );
    this.logger.log(
      `Authorization header: ${req?.headers?.authorization || 'none'}`
    );

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
