import { Entity, PrimaryGeneratedColumn, Column, JoinColumn, CreateDateColumn, ManyToOne, OneToMany, ManyToMany, JoinTable } from 'typeorm';
import { UserEntity } from './user.entity';
import { ProjectRoleEntity } from './project-role.entity';
import { ProjectGroupEntity } from './project-group.entity';
import { BranchEntity } from './branch.entity';
import { CommitEntity } from './commit.entity';
import { FileEntity } from './file.entity';
import { CategoryEntity } from './category.entity';
import { ProjectTagEntity } from './project-tag.entity';
import { ProjectDiscussionThreadEntity } from './project-discussion.entity';

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

  @Column({ type: 'json', nullable: true })
  targetLanguages: string[];

  @ManyToOne(() => UserEntity, user => user.createdProjects)
  createdBy: UserEntity;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => ProjectRoleEntity, projectRole => projectRole.project, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  projectRoles: ProjectRoleEntity[];

  @OneToMany(() => ProjectGroupEntity, group => group.project, {
    cascade: true,
    onDelete: 'CASCADE',
  })
  groups: ProjectGroupEntity[];

  @OneToMany(() => BranchEntity, branch => branch.project)
  branches: BranchEntity[];

  @ManyToOne(() => BranchEntity, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'defaultBranchId' })
  defaultBranch: BranchEntity;

  @OneToMany(() => CommitEntity, commit => commit.project)
  commits: CommitEntity[];

  @OneToMany(() => ProjectDiscussionThreadEntity, thread => thread.project)
  discussions: ProjectDiscussionThreadEntity[];

  @OneToMany(() => FileEntity, file => file.project)
  file: FileEntity[];

  @ManyToOne(() => CategoryEntity, category => category.id)
  category: CategoryEntity;

  @ManyToMany(() => UserEntity, user => user.projects)
  @JoinTable({
    joinColumn: { name: 'projectId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'userId', referencedColumnName: 'id' }
  })
  members: UserEntity[];

  @ManyToMany(() => ProjectTagEntity, { cascade: true })
  @JoinTable({
    joinColumn: { name: 'projectId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'tagId', referencedColumnName: 'id' }
  })
  tags: ProjectTagEntity[];
}
