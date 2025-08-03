import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AuthService } from '../auth.service';
import { ExtractJwt } from 'passport-jwt';

@Injectable()
export class JwtFallthroughGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    let token = ExtractJwt.fromAuthHeaderAsBearerToken()(request);

    if (!token && request.cookies) {
      token = request.cookies['access_token'];
    }

    if (!token) {
      return true;
    }

    try {
      request.user = await this.authService.validateToken(token); // ✅ attach user
    } catch {
       return false;
    }

    return true;
  }
}
