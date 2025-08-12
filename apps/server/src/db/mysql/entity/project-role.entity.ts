import { Column, Entity, JoinTable, ManyToMany, ManyToOne, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';
import type { UserEntity } from './user.entity';
import type { ProjectEntity } from './project.entity';
import { Permission, PermissionFlags } from '@here-to-translate/common';
import { BigIntColumnTransformer } from '#LocalProject/Utils/extensions/typeorm.extensions';
import { BranchEntity } from './branch.entity';

@Entity('projectrole')
export class ProjectRoleEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: bigint;

  @ManyToOne(() => require('./project.entity').ProjectEntity, project => project.projectRoles,{
    onDelete: 'CASCADE',
  })
  project: ProjectEntity;

  @ManyToMany(() => require('./user.entity').UserEntity, user => user.projectRoles, { cascade: true })
  @JoinTable({
    name: 'user_project_roles',
    joinColumn: { name: 'roleId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'userId', referencedColumnName: 'id' }
  })
  users: UserEntity[];

  @Column({ type: 'varchar', length: 32 })
  name: string;

  @Column({
    type: 'bigint',
    unsigned: true,
    default: PermissionFlags.None,
    transformer: BigIntColumnTransformer(Permission)
  })
  permissionFlags: Permission;

  @ManyToMany(() => require('./branch.entity').BranchEntity, branch => branch.visibleToRoles)
  branch: BranchEntity;

  @CreateDateColumn()
  createdAt: Date;
}

