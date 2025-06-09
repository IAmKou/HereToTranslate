import { Entity, PrimaryGeneratedColumn, Column, JoinColumn, ManyToOne, CreateDateColumn, OneToMany } from 'typeorm';
import { RoleEntity } from './role.entity';
import { ProjectEntity } from './project.entity';
import { ProjectRoleEntity } from './projectRole.entity';
import { GroupMemberEntity } from './groupMember.entity';
import { BranchEntity } from './branch.entity';
import { CommitEntity } from './commit.entity';
import {FileEntity} from './file.entity';

export enum UserRole {
  Admin = 1,
  User
}

@Entity('user')
export class UserEntity {

  @PrimaryGeneratedColumn()
  id: bigint;

  @Column({unique:true, length:50})
  username: string;

  @Column({unique:true, length:100})
  email: string;

  @Column({length:255})
  passwordHash: string;

  @Column({unique:true, length:50})
  phone: string;

  @Column({length:100})
  fullName: string;

  @ManyToOne(() => RoleEntity, role => role.users)
  @JoinColumn({ name: 'roleId' })
  @Column({ name: 'roleId', default: UserRole.User })
  role: RoleEntity;

  @Column({ default : true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => ProjectEntity, project => project.createdBy)
  createdProjects: ProjectEntity[];

  @OneToMany(() => ProjectRoleEntity, projectRole => projectRole.user)
  projectRoles: ProjectRoleEntity[];

  @OneToMany(() => GroupMemberEntity, groupMember => groupMember.user)
  groupMemberships: GroupMemberEntity[];

  @OneToMany(() => BranchEntity, branch => branch.user)
  branch: BranchEntity[];

  @OneToMany(() => CommitEntity, commit => commit.author)
  commit: CommitEntity[];

  @OneToMany(() => FileEntity, file => file.uploader)
  file: FileEntity[];
}
