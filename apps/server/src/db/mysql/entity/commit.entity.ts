import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
} from 'typeorm';
import type { BranchEntity } from './branch.entity';
import type { ProjectEntity } from './project.entity';
import type { UserEntity } from './user.entity';

export enum CommitStatus {
  Pending = 'pending',
  Approved = 'approved',
  Rejected = 'rejected',
}

@Entity('commits')
export class CommitEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: bigint;

  @ManyToOne(() => require('./branch.entity').BranchEntity, (branch: BranchEntity) => branch.commits, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  branch: BranchEntity;

  @ManyToOne(() => require('./project.entity').ProjectEntity, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  project: ProjectEntity;

  @ManyToOne(() => require('./user.entity').UserEntity, (user: UserEntity) => user.id, {
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
