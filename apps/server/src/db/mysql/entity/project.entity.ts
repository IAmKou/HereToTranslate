import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { UserEntity } from './user.entity';
import { ProjectRoleEntity } from './projectRole.entity';
import { ProjectGroupEntity } from './projectGroup.entity';
import { BranchEntity } from './branch.entity';
import { CommitEntity } from './commit.entity';
import { FileEntity } from './file.entity';
import { CategoryEntity } from './category.entity';
@Entity('project')
export class ProjectEntity {
  @PrimaryGeneratedColumn()
  id: bigint;

  @Column()
  name: string;

  @Column({type : 'text', nullable: true})
  description: string;

  @ManyToOne(() => UserEntity, user => user.createdProjects)
  @JoinColumn({ name: 'createdBy' })
  createdBy: UserEntity;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => ProjectRoleEntity, projectRole => projectRole.project)
  projectRoles: ProjectRoleEntity[];

  @OneToMany(() => ProjectGroupEntity, group => group.project)
  groups: ProjectGroupEntity[];

  @OneToMany(() => BranchEntity, branch => branch.project)
  branch: BranchEntity[];

  @OneToMany(() => CommitEntity, commit => commit.project)
  commit: CommitEntity[];

  @OneToMany(() => FileEntity, file => file.project)
  file: FileEntity[];

  @ManyToOne(() => CategoryEntity, category => category.project)
  @JoinColumn({ name: 'categoryId' })
  category: CategoryEntity;

}
