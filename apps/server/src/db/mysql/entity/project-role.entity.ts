import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany } from 'typeorm';
import { ProjectEntity } from './project.entity';
import { PermissionRoleEntity } from './permissionRole.entity';

@Entity('projectRole')
@Unique(['project', 'user'])
export class ProjectRoleEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @ManyToOne(() => ProjectEntity, project => project.projectRoles)
  project: ProjectEntity;

  @ManyToOne(() => UserEntity, user => user.projectRoles)
  user: UserEntity;

  @Column({ type: 'varchar', length: 32 })
  name: string;

  @Column({ type: 'bigint', default: 0 })
  permissions: bigint;
}
