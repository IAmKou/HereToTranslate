import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany } from 'typeorm';
import { ProjectEntity } from './project.entity';
import { PermissionRoleEntity } from './permissionRole.entity';


@Entity('projectrole')
export class ProjectRoleEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @ManyToOne(() => ProjectEntity, project => project.projectRoles)
  project: ProjectEntity;

  @Column({default: false})
  isSystem: boolean;

  @OneToMany(() => PermissionRoleEntity, permissionRole => permissionRole.prole)
  permissionRoles: PermissionRoleEntity[];

}
