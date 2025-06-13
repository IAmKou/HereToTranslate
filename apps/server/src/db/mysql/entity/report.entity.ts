import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { UserEntity } from './user.entity';
import { CommentEntity } from './comment.entity';

export enum ReportStatus {
  New = 'NEW',
  Reviewed = 'REVIEWED',
  Cancelled = 'CANCELLED',
}

@Entity('reports')
export class ReportEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  reportedBy: UserEntity;

  @ManyToOne(() => CommentEntity, { onDelete: 'CASCADE' })
  comment: CommentEntity;

  @Column({ type: 'enum', enum: ReportStatus, default: ReportStatus.New })
  status: ReportStatus;

  @CreateDateColumn()
  createdAt: Date;
}
