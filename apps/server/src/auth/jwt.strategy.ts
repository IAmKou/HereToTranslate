import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from './auth.service';
import { Request } from 'express';

const cookieExtractor = (req: Request) => {
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
  constructor(private readonly authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        cookieExtractor,
        headerExtractor,
      ]),
      secretOrKey: process.env.JWT_SECRET ?? 'secret',
      passReqToCallback: true,
    });
  }

  async validate(payload: any, req: Request): Promise<any> {
    Logger.log(`JWT Strategy validate called with payload sub: ${payload?.sub || 'undefined'}`);
    
    const token =
      req?.cookies?.access_token ||
      req?.cookies?.accessToken ||
      headerExtractor(req);

    Logger.log(`Extracted token: ${token ? token.substring(0, 20) + '...' : 'null'}`);
    Logger.log(`Authorization header: ${req?.headers?.authorization || 'none'}`);
    Logger.log(`Cookies: ${JSON.stringify(req?.cookies || {})}`);

    if (!token) {
      Logger.warn('No token provided');
      throw new UnauthorizedException('No token provided');
    }

    try {
      const user = await this.authService.validateToken(token);
      Logger.log(`Token validation successful for user: ${user.username}`);
      return user;
    } catch (error) {
      Logger.error(
        `Token validation failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      throw new UnauthorizedException('Invalid token');
    }
  }
}
