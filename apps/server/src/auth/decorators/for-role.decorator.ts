import { SetMetadata } from '@nestjs/common';
import { UserRole } from '#LocalProject/Entities';
export const ForRoles = (...roles: UserRole[]) => SetMetadata('roles', roles);
