import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn
} from 'typeorm';
import type { RequestEntity } from './request.entity';
import type { UserEntity } from './user.entity';

export enum AdminReviewDecision {
  ApproveTranslator = 'APPROVE_TRANSLATOR',
  ApproveRequester = 'APPROVE_REQUESTER',
}

@Entity('admin_reviews')
export class AdminReviewEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: bigint;

  @ManyToOne(() => require('./request.entity').RequestEntity, (request: RequestEntity) => request.id, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'requestId' })
  request: RequestEntity;

  @ManyToOne(() => require('./user.entity').UserEntity, (user: UserEntity) => user.id, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'adminId' })
  admin: UserEntity;

  // Decision is set when admin reviews; null while pending
  @Column({ type: 'enum', enum: AdminReviewDecision, nullable: true })
  decision?: AdminReviewDecision | null;

  @Column({ type: 'text', nullable: true })
  reason?: string;

  // Snapshot of requester review submission for admin context
  @Column({ type: 'int', nullable: true })
  rating?: number | null;

  @Column({ type: 'text', nullable: true })
  comment?: string | null;

  @Column({ type: 'text', nullable: true })
  rejectionReason?: string | null;

  @CreateDateColumn()
  createdAt: Date;
}


