import { Entity, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm';
import { ProjectEntity } from './project.entity';
import { UserEntity } from './user.entity';
import { ProjectRoleEntity} from './projectRole.entity';

@Entity('projectuserrole')
@Unique(['project','user'])
export class ProjectUserRoleEntity {
  @PrimaryGeneratedColumn()
  id: bigint;

  @ManyToOne(() => ProjectEntity, project => project.pur)
  project: ProjectEntity;

  @ManyToOne(() => UserEntity, user => user.projectRoles)
  user: UserEntity;

  @ManyToOne(() => ProjectRoleEntity, prole => prole.permissionRoles)
  prole: ProjectRoleEntity;
}
