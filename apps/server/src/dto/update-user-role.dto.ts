import { IsEnum } from 'class-validator';
import { UserRole } from '#LocalProject/Entities';

export class UpdateUserRoleDto {
  @IsEnum(UserRole)
  role: UserRole;
}
