import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
} from 'typeorm';
import { BranchEntity } from './branch.entity';
import { ProjectEntity } from './project.entity';
import { UserEntity } from './user.entity';

export enum CommitStatus {
  Pending = 'pending',
  Approved = 'approved',
  Rejected = 'rejected',
}

@Entity('commits')
export class CommitEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: bigint;

  @ManyToOne(() => BranchEntity, branch => branch.commits, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  branch: BranchEntity;

  @ManyToOne(() => ProjectEntity, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  project: ProjectEntity;

  @ManyToOne(() => UserEntity, user => user.id, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  author: UserEntity;

  @Column({ type: 'text', nullable: true })
  message: string;

  @Column({ type: 'text', name: 'content_snapshot', nullable: true })
  contentSnapshot: string;

  @Column({ nullable: true })
  filePath: string;

  @Column({
    type: 'enum',
    enum: CommitStatus,
    default: CommitStatus.Pending,
  })
  status: CommitStatus;

  @Column({ type: 'bigint', nullable: true })
  reviewedByUserId?: bigint;

  @Column({ type: 'text', nullable: true })
  reviewMessage?: string;

  @CreateDateColumn()
  createdAt: Date;
}
