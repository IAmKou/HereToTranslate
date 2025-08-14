import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { TaskEntity } from './task.entity';
import { UserEntity } from './user.entity';
import { TaskStatusEntity } from './task-status.entity';
import type { SubtaskAssignmentEntity } from './subtask-assignment.entity';
import type { SubtaskStatusHistoryEntity } from './subtask-status-history.entity';

export enum SubtaskKind {
  DISCREET = 'discreet',
  RANGE = 'range',
}

@Entity('subtask')
export class SubtaskEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: bigint;

  @ManyToOne(() => TaskEntity, task => task.subtasks, { onDelete: 'CASCADE' })
  parentTask: TaskEntity;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @ManyToOne(() => TaskStatusEntity, { nullable: false, onDelete: 'RESTRICT' })
  status: TaskStatusEntity;

  @Column({ type: 'enum', enum: SubtaskKind, default: SubtaskKind.DISCREET })
  kind: SubtaskKind;

  @Column({ type: 'int', default: 0 })
  workCount: number;

  @Column({ type: 'datetime', nullable: true })
  dueDate?: Date;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
  assignedTo?: UserEntity;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
  reviewer?: UserEntity;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
  approver?: UserEntity;

  @ManyToOne(() => UserEntity, { nullable: false, onDelete: 'CASCADE' })
  createdBy: UserEntity;

  @Column({ type: 'boolean', default: false })
  isOverdue: boolean;

  @Column({ type: 'datetime', nullable: true })
  startedAt?: Date;

  @Column({ type: 'datetime', nullable: true })
  completedAt?: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  estimatedBusinessHours?: number;

  @Column({ type: 'enum', enum: ['low', 'medium', 'high'], default: 'medium' })
  priority: string;

  @OneToMany(
    () => require('./subtask-assignment.entity').SubtaskAssignmentEntity,
    (assignment: SubtaskAssignmentEntity) => assignment.subtask,
    { cascade: true }
  )
  assignments: SubtaskAssignmentEntity[];

  @OneToMany(
    () => require('./subtask-status-history.entity').SubtaskStatusHistoryEntity,
    (history: SubtaskStatusHistoryEntity) => history.subtask,
    { cascade: true }
  )
  statusHistory: SubtaskStatusHistoryEntity[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  get currentTranslator(): UserEntity | undefined {
    return this.assignments?.find((a: SubtaskAssignmentEntity) => a.role === 'translator' && a.status === 'assigned')?.assignedTo;
  }

  get currentReviewer(): UserEntity | undefined {
    return this.assignments?.find((a: SubtaskAssignmentEntity) => a.role === 'reviewer' && a.status === 'assigned')?.assignedTo;
  }

  get currentApprover(): UserEntity | undefined {
    return this.assignments?.find((a: SubtaskAssignmentEntity) => a.role === 'approver' && a.status === 'assigned')?.assignedTo;
  }
}
