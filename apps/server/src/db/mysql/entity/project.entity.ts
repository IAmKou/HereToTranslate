import { Entity, PrimaryGeneratedColumn, Column, JoinColumn, CreateDateColumn, ManyToOne, OneToMany, ManyToMany, JoinTable } from 'typeorm';
import type { UserEntity } from './user.entity';
import type { ProjectRoleEntity } from './project-role.entity';
import type { ProjectGroupEntity } from './project-group.entity';
import type { BranchEntity } from './branch.entity';
import type { CommitEntity } from './commit.entity';
import type { FileEntity } from './file.entity';
import type { CategoryEntity } from './category.entity';
import type { ProjectTagEntity } from './project-tag.entity';
import type { ProjectDiscussionThreadEntity } from './project-discussion.entity';

@Entity('project')
export class ProjectEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: bigint;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'boolean', default: true })
  isPrivate: boolean;

  @Column({ type: 'boolean', default: false })
  isArchived: boolean;

  @Column({ type: 'json', nullable: true })
  targetLanguages: string[];

  @ManyToOne(() => require('./user.entity').UserEntity, (user: UserEntity) => user.createdProjects)
  createdBy: UserEntity;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => require('./project-role.entity').ProjectRoleEntity, (projectRole: ProjectRoleEntity) => projectRole.project, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  projectRoles: ProjectRoleEntity[];

  @OneToMany(() => require('./project-group.entity').ProjectGroupEntity, (group: ProjectGroupEntity) => group.project, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  groups: ProjectGroupEntity[];

  @OneToMany(() => require('./branch.entity').BranchEntity, (branch: BranchEntity) => branch.project)
  branches: BranchEntity[];

  @ManyToOne(() => require('./branch.entity').BranchEntity, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'defaultBranchId' })
  defaultBranch: BranchEntity;

  @OneToMany(() => require('./commit.entity').CommitEntity, (commit: CommitEntity) => commit.project)
  commits: CommitEntity[];

  @OneToMany(() => require('./project-discussion.entity').ProjectDiscussionThreadEntity, (thread: ProjectDiscussionThreadEntity) => thread.project)
  discussions: ProjectDiscussionThreadEntity[];

  @OneToMany(() => require('./file.entity').FileEntity, (file: FileEntity) => file.project)
  file: FileEntity[];

  @ManyToOne(() => require('./category.entity').CategoryEntity, (category: CategoryEntity) => category.id)
  category: CategoryEntity;

  @ManyToMany(() => require('./user.entity').UserEntity, (user: UserEntity) => user.projects)
  @JoinTable({
    joinColumn: { name: 'projectId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'userId', referencedColumnName: 'id' }
  })
  members: UserEntity[];

  @ManyToMany(() => require('./project-tag.entity').ProjectTagEntity, { cascade: true })
  @JoinTable({
    joinColumn: { name: 'projectId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'tagId', referencedColumnName: 'id' }
  })
  tags: ProjectTagEntity[];
}
