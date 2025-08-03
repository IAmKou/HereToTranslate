import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '#LocalProject/Auth/decorators';

@Injectable()
export class JwtAuthGuard
  extends AuthGuard('jwt')
  implements CanActivate {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  override canActivate(context: ExecutionContext) {
    const isPublicEndpoint = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublicEndpoint) {
      return true;
    }

    return super.canActivate(context);
  }
}
