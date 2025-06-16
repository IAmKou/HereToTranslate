import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, Unique } from 'typeorm';
import { ProjectEntity } from './project.entity';
import { UserEntity } from './user.entity';

@Entity('projectrole')
@Unique(['project', 'user'])
export class ProjectRoleEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => ProjectEntity, project => project.projectRoles)
  project: ProjectEntity;

  @ManyToOne(() => UserEntity)
  user: UserEntity;

  @Column({ type: 'varchar', length: 32 })
  name: string;

  @Column({ type: 'bigint', default: 0 })
  permissions: bigint;
}
