import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, Unique } from 'typeorm';
import { UserEntity } from './user.entity';
import { ProjectEntity } from './project.entity';
import { UserPermission } from '@here-to-translate/common';

@Entity('projectRole')
@Unique(['project', 'user'])
export class ProjectRoleEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: bigint;

  @ManyToOne(() => ProjectEntity, project => project.projectRoles)
  project: ProjectEntity;

  @ManyToOne(() => UserEntity, user => user.projectRoles)
  user: UserEntity;

  @Column({ type: 'varchar', length: 32 })
  name: string;

  @Column({
    type: 'bigint',
    default: 0,
    transformer: {
      from(value: bigint) { return new UserPermission(value); },
      to(permission: UserPermission) { return permission.value; }
    }
  })
  permissions: UserPermission;
}

