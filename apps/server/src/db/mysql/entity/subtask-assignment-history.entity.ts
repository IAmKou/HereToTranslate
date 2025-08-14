import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { SubtaskEntity } from './subtask.entity';
import { SubtaskAssignmentEntity, SubtaskAssignmentRole } from './subtask-assignment.entity';
import type { UserEntity } from './user.entity';

export enum SubtaskHistoryAction {
  ASSIGNED = 'assigned',
  REASSIGNED = 'reassigned',
  CANCELLED = 'cancelled',
}

@Entity('subtask_assignment_history')
export class SubtaskAssignmentHistoryEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: bigint;

  @ManyToOne(() => require('./subtask.entity').SubtaskEntity, { onDelete: 'CASCADE' })
  subtask: SubtaskEntity;

  @ManyToOne(() => SubtaskAssignmentEntity, { nullable: true, onDelete: 'CASCADE' })
  assignment?: SubtaskAssignmentEntity;

  @Column({ type: 'enum', enum: SubtaskAssignmentRole })
  role: SubtaskAssignmentRole;

  @Column({ type: 'enum', enum: SubtaskHistoryAction })
  action: SubtaskHistoryAction;

  @ManyToOne(() => require('./user.entity').UserEntity, { nullable: true, onDelete: 'SET NULL' })
  fromUser?: UserEntity; 

  @ManyToOne(() => require('./user.entity').UserEntity, { nullable: true, onDelete: 'SET NULL' })
  toUser?: UserEntity; 

  @ManyToOne(() => require('./user.entity').UserEntity, { nullable: false, onDelete: 'CASCADE' })
  actionBy: UserEntity; 

  @Column({ type: 'text', nullable: true })
  reason?: string; 

  @Column({ type: 'json', nullable: true })
  metadata?: {
    previousStatus?: string;
    newStatus?: string;
    pagesAffected?: number[];
    estimatedImpact?: string;
  };

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @CreateDateColumn()
  createdAt: Date;
}
