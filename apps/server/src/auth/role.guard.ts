import { CanActivate, ExecutionContext, Injectable, } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserEntity, UserRole } from '../db/mysql/entity/user.entity';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.get<UserRole[]>('roles', context.getHandler());
    if (!roles) return true;
    const request = context.switchToHttp().getRequest();
    const user = request.user as UserEntity;
    return roles.includes(user.role.id);
  }
}
