import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { ProjectRoleEntity } from './projectRole.entity';

@Entity('permissionroles')
export class PermissionRoleEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => ProjectRoleEntity, prole => prole.permissionRoles)
  prole: ProjectRoleEntity;

  @Column()
  name: string;
}
