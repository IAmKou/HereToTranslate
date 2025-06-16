import { Injectable, Logger } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from './auth.service';
import { Request } from 'express';
import { AuthenticatedRequest } from './types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {

  private readonly logger = new Logger('JwtStrategy');

  override validate(): never {
    throw new Error('Unxpected call to JwtStrategy#validate()');
  }

  constructor(private readonly authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET_KEY ?? 'secret',  // MUST match JWT module config
      passReqToCallback: true,
    });
  }

  override authenticate(req: Request) {
    const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
    this.authService.validateToken(token)
      .then(user => {
        if (!user) {
          this.logger.warn(`Unauthorized access attempt with token: ${token}`);
          /* unreachable */ return this.fail('Unauthorized', 401);
        }
        (req as AuthenticatedRequest).user = user;
        return this.success(user);
      })
      .catch(error => this.fail(error, 401));
  }
}
