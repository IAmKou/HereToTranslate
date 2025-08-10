import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { TaskAssignmentEntity, AssignmentRole } from './task-assignment.entity';
import { UserEntity } from './user.entity';
import { TaskEntity } from './task.entity';

export enum HistoryAction {
  ASSIGNED = 'assigned',
  REASSIGNED = 'reassigned',
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Entity('assignment_history')
export class AssignmentHistoryEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: bigint;

  @ManyToOne(() => TaskEntity, { onDelete: 'CASCADE' })
  task: TaskEntity;

  @ManyToOne(() => TaskAssignmentEntity, { nullable: true, onDelete: 'CASCADE' })
  assignment?: TaskAssignmentEntity;

  @Column({ type: 'enum', enum: AssignmentRole })
  role: AssignmentRole;

  @Column({ type: 'enum', enum: HistoryAction })
  action: HistoryAction;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
  fromUser?: UserEntity; // Previous assignee (for reassignments)

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
  toUser?: UserEntity; // New assignee

  @ManyToOne(() => UserEntity, { nullable: false, onDelete: 'CASCADE' })
  actionBy: UserEntity; // Who performed the action

  @Column({ type: 'text', nullable: true })
  reason?: string; // Reason for change

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
