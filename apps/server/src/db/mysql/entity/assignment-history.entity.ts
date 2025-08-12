import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { TaskAssignmentEntity, AssignmentRole } from './task-assignment.entity';
import type { UserEntity } from './user.entity';
import type { TaskEntity } from './task.entity';

export enum HistoryAction {
  ASSIGNED = 'assigned',
  REASSIGNED = 'reassigned',
  CANCELLED = 'cancelled',
}

@Entity('assignment_history')
export class AssignmentHistoryEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: bigint;

  @ManyToOne(() => require('./task.entity').TaskEntity, { onDelete: 'CASCADE' })
  task: TaskEntity;

  @ManyToOne(() => TaskAssignmentEntity, { nullable: true, onDelete: 'CASCADE' })
  assignment?: TaskAssignmentEntity;

  @Column({ type: 'enum', enum: AssignmentRole })
  role: AssignmentRole;

  @Column({ type: 'enum', enum: HistoryAction })
  action: HistoryAction;

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