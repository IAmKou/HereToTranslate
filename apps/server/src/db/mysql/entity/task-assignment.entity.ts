import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { TaskEntity } from './task.entity';
import { UserEntity } from './user.entity';

export enum AssignmentRole {
  TRANSLATOR = 'translator',
  REVIEWER = 'reviewer',
  APPROVER = 'approver',
}

export enum AssignmentStatus {
  ASSIGNED = 'assigned',
  REASSIGNED = 'reassigned',
}

@Entity('task_assignment')
@Index(['task', 'role'], { unique: true }) // One assignment per role per task
export class TaskAssignmentEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: bigint;

  @ManyToOne(() => TaskEntity, { onDelete: 'CASCADE' })
  task: TaskEntity;

  @ManyToOne(() => UserEntity, { nullable: false, onDelete: 'CASCADE' })
  assignedTo: UserEntity;

  @Column({ type: 'enum', enum: AssignmentRole })
  role: AssignmentRole;

  @Column({ type: 'enum', enum: AssignmentStatus, default: AssignmentStatus.ASSIGNED })
  status: AssignmentStatus;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ type: 'datetime', nullable: true })
  dueDate?: Date;

  @Column({ type: 'json', nullable: true })
  workData?: {
    pagesAssigned: number[];
    estimatedHours: number;
    actualHours?: number;
    qualityScore?: number;
  };

  @ManyToOne(() => UserEntity, { nullable: false, onDelete: 'CASCADE' })
  assignedBy: UserEntity;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
  reassignedBy?: UserEntity;

  @Column({ type: 'datetime', nullable: true })
  reassignedAt?: Date;

  @Column({ type: 'text', nullable: true })
  reassignmentReason?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
