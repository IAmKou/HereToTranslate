import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from './auth.service';
import { Request } from 'express';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  override validate(...args: any[]): unknown {
    throw new Error('Method not implemented.');
  }
  constructor(private readonly authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET_KEY ?? 'secret',  // MUST match JWT module config
      passReqToCallback: true,
    });
  }

  override async authenticate(req: Request, options?: any) {
    const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
    try {
      const user = await this.authService.validateToken(token);
      this.success(user)
    } catch (error) {
      this.fail(error, 401);
    }

    if (!token) {
      throw new UnauthorizedException('Missing token');
    }

    const user = await this.authService.validateToken(token);

    return {
      id: user.id,
      username: user.username,
      role: user.role?.name,
    }; // 🔥 return plain object
  }

}
