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
import type { ProjectEntity } from './project.entity';
import type { ProjectRoleEntity } from './project-role.entity';
import type { BranchEntity } from './branch.entity';
import type { CommitEntity } from './commit.entity';
import type { FileEntity } from './file.entity';
import type { ProjectGroupEntity } from './project-group.entity';
import type { UserTypeEntity } from './user-type.entity';
import type { RequestEntity } from './request.entity';
import type { ProjectDiscussionCommentEntity } from './project-discussion.entity';

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

  @Column({ type: 'varchar', length: 255, nullable: true })
  avatarUrl?: string;

  @Column({ type: 'longblob', nullable: true })
  avatarData?: Buffer;

  @Column({ type: 'varchar', length: 50, nullable: true })
  avatarMimeType?: string;

  @ManyToOne(() => require('./user-type.entity').UserTypeEntity, role => role.users)
  @JoinColumn({ name: 'roleId' })
  role: UserTypeEntity;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => require('./project.entity').ProjectEntity, project => project.createdBy)
  createdProjects: ProjectEntity[];

  @ManyToMany(() => require('./project-role.entity').ProjectRoleEntity, projectRole => projectRole.users)
  projectRoles: ProjectRoleEntity[];

  @ManyToMany(() => require('./project.entity').ProjectEntity, project => project.members, { cascade: true })
  projects: ProjectEntity[];

  @ManyToMany(() => require('./project-group.entity').ProjectGroupEntity, group => group.members, { cascade: true })
  groups: ProjectGroupEntity[];

  @OneToMany(() => require('./branch.entity').BranchEntity, branch => branch.user)
  branch: BranchEntity[];

  @OneToMany(() => require('./commit.entity').CommitEntity, commit => commit.author)
  commit: CommitEntity[];

  @OneToMany(() => require('./file.entity').FileEntity, file => file.uploader)
  file: FileEntity[];

  @ManyToMany(() => require('./request.entity').RequestEntity, request => request.registrants)
  registeredRequests: RequestEntity[];

  @ManyToMany(() => require('./project-discussion.entity').ProjectDiscussionCommentEntity, upvote => upvote.upvotes, { cascade: true })
  upvote: ProjectDiscussionCommentEntity[];

  @ManyToMany(() => require('./project-discussion.entity').ProjectDiscussionCommentEntity, downvote => downvote.downvotes, { cascade: true })
  downvote: ProjectDiscussionCommentEntity[];

}
