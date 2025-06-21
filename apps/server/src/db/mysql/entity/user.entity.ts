import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToMany,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn
} from 'typeorm';
import { RoleEntity } from './role.entity';
import { ProjectEntity } from './project.entity';
import { ProjectRoleEntity } from './project-role.entity';
import { BranchEntity } from './branch.entity';
import { CommitEntity } from './commit.entity';
import { FileEntity } from './file.entity';
import { ProjectGroupEntity } from './project-group.entity';

export enum UserRole {
  Admin = 1,
  Member
}

@Entity('user')
export class UserEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: bigint;

  @Column({ unique: true, length: 50 })
  username: string;

  @Column({ unique: true, length: 100 })
  email: string;

  @Column({ length: 255 })
  passwordHash: string;

  @Column({ unique: true, length: 50 })
  phone: string;

  @Column({ length: 100 })
  fullName: string;

  @ManyToOne(() => RoleEntity, role => role.users)
  @JoinColumn({ name: 'roleId' })
  role: RoleEntity;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => ProjectEntity, project => project.createdBy)
  createdProjects: ProjectEntity[];

  @ManyToMany(() => ProjectRoleEntity, projectRole => projectRole.users)
  projectRoles: ProjectRoleEntity[];

  @ManyToMany(() => ProjectEntity, project => project.members, { cascade: true })
  projects: ProjectEntity[];

  @ManyToMany(() => ProjectGroupEntity, group => group.members, { cascade: true })
  groups: ProjectGroupEntity[];

  @OneToMany(() => BranchEntity, branch => branch.user)
  branch: BranchEntity[];

  @OneToMany(() => CommitEntity, commit => commit.author)
  commit: CommitEntity[];

  @OneToMany(() => FileEntity, file => file.uploader)
  file: FileEntity[];
}
