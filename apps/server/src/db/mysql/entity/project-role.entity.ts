import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, Unique } from 'typeorm';
import { UserEntity } from './user.entity';
import { ProjectEntity } from './project.entity';
import { Permission } from '@here-to-translate/common';

@Entity('projectRole')
@Unique(['project', 'user'])
export class ProjectRoleEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: bigint;

  @ManyToOne(() => ProjectEntity, project => project.projectRoles)
  project: ProjectEntity;

  @ManyToOne(() => UserEntity, user => user.projectRoles)
  user: UserEntity;

  @Column({ type: 'varchar', length: 32 })
  name: string;

  @Column({
    type: 'bigint',
    default: 0n,
    transformer: {
      from(value: bigint | Permission) {
        if (value instanceof Permission) {
          return value;
        }
        return new Permission(value);
      },
      to(permission: Permission) { return permission.value; }
    }
  })
  permissionFlags: Permission;
}

