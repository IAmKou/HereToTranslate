import { SetMetadata } from '@nestjs/common';
import { UserRole } from '../db/mysql/entity/user.entity';
export const Roles = (...roles: UserRole[]) => SetMetadata('roles', roles);
