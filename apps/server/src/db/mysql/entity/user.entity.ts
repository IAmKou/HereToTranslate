import { Entity, PrimaryGeneratedColumn, Column, JoinColumn, ManyToOne, CreateDateColumn, OneToMany } from 'typeorm';
import { RoleEntity } from './role.entity';
import { ProjectEntity } from './project.entity';
import { GroupMemberEntity } from './group-member.entity';
import { BranchEntity } from './branch.entity';
import { CommitEntity } from './commit.entity';
import { FileEntity } from './file.entity';
import { ProjectRoleEntity } from './project-role.entity';

export enum UserRole {
  SuperAdmin = 1,
  Admin = 2,
  Member = 3
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

  @OneToMany(() => GroupMemberEntity, groupMember => groupMember.user)
  groupMemberships: GroupMemberEntity[];

  @OneToMany(() => BranchEntity, branch => branch.user)
  branch: BranchEntity[];

  @OneToMany(() => CommitEntity, commit => commit.author)
  commit: CommitEntity[];

  @OneToMany(() => FileEntity, file => file.uploader)
  file: FileEntity[];

  @OneToMany(() => ProjectRoleEntity, projectRole => projectRole.user)
  projectRoles: ProjectRoleEntity[];


}
