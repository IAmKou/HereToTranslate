import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { TaskEntity } from './task.entity';
import { UserEntity } from './user.entity';
import { AssignmentRole } from './task-assignment.entity';

export enum AssignmentChangeType {
  ASSIGNED = 'assigned',
  REASSIGNED = 'reassigned',
  REMOVED = 'removed',
}

@Entity('task_assignment_history')
export class TaskAssignmentHistoryEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: bigint;

  @ManyToOne(() => TaskEntity, { onDelete: 'CASCADE' })
  task: TaskEntity;

  @Column({ type: 'enum', enum: AssignmentChangeType })
  changeType: AssignmentChangeType;

  @Column({ type: 'enum', enum: AssignmentRole })
  role: AssignmentRole;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
  fromUser?: UserEntity; // Previous assignee

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
  toUser?: UserEntity; // New assignee

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  changedBy: UserEntity; // Who made the change

  @Column({ type: 'text', nullable: false })
  reason: string;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ type: 'datetime', nullable: true })
  dueDate?: Date;

  @CreateDateColumn()
  createdAt: Date;
}
