import {Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne} from 'typeorm';
import { BranchEntity} from './branch.entity';
import { ProjectEntity } from './project.entity';
import { UserEntity } from './user.entity';

@Entity('commit')
export class CommitEntity{

  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => BranchEntity, branch => branch.commits, { nullable: false, onDelete: 'CASCADE' })
  branch: BranchEntity;

  @ManyToOne(() => ProjectEntity, { nullable: true, onDelete: 'SET NULL' })
  project: ProjectEntity;

  @ManyToOne(() => UserEntity, user => user.id, { nullable: false, onDelete: 'CASCADE' })
  author: UserEntity;

  @Column({ type: 'text', nullable: true })
  message: string;

  @Column({ type: 'text', name: 'content_snapshot', nullable: true })
  contentSnapshot: string;

  @CreateDateColumn()
  createdAt: Date;

}
