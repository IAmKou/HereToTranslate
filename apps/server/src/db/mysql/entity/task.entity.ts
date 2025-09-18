import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { UserEntity } from './user.entity';
import { ProjectGroupEntity } from './project-group.entity';
import { TaskStatusEntity } from './task-status.entity';
import { WorkflowEntity } from './workflow.entity';
import { TaskAssignmentEntity } from './task-assignment.entity';
import { TaskStatusHistoryEntity } from './task-status-history.entity';
import { SubtaskEntity } from './subtask.entity';

@Entity('task')
export class TaskEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: bigint;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @ManyToOne(() => TaskStatusEntity, { nullable: false, onDelete: 'RESTRICT' })
  status: TaskStatusEntity;

  @ManyToOne(() => WorkflowEntity, { nullable: true, onDelete: 'SET NULL' })
  workflow?: WorkflowEntity;

  @Column({ type: 'varchar', nullable: true })
  projectId?: string;

  @Column({ type: 'varchar', nullable: true })
  branchId?: string;

  @Column({ type: 'varchar', nullable: true })
  fileId?: string;

  @Column({ type: 'text', nullable: true })
  originalText?: string;

  @Column({ type: 'text', nullable: true })
  translatedText?: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  language?: string;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
  assignedTo?: UserEntity;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
  reviewer?: UserEntity;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
  approver?: UserEntity;

  @Column({ type: 'boolean', default: false })
  isOverdue: boolean;

  @ManyToOne(() => ProjectGroupEntity, { nullable: true, onDelete: 'SET NULL' })
  group?: ProjectGroupEntity;

  @ManyToOne(() => UserEntity, { nullable: false, onDelete: 'CASCADE' })
  createdBy: UserEntity;

  @Column({ type: 'datetime', nullable: true })
  dueDate?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'datetime', nullable: true })
  startedAt?: Date;

  @Column({ type: 'datetime', nullable: true })
  completedAt?: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  estimatedBusinessHours?: number;

  @Column({ type: 'json', nullable: true })
  customFields?: Record<string, unknown>;

  @Column({ type: 'enum', enum: ['low', 'medium', 'high'], default: 'medium' })
  priority: string;

  @Column({ type: 'int', nullable: true })
  storyPoints?: number;

  @Column({ type: 'json', nullable: true })
  selectedStrings?: number[]; 

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalScore: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalAmount: number;

  @Column({ type: 'int', default: 0 })
  totalStrings: number;

  @OneToMany(() => TaskAssignmentEntity, assignment => assignment.task, { cascade: true })
  assignments: TaskAssignmentEntity[];

  @OneToMany(() => TaskStatusHistoryEntity, history => history.task, { cascade: true })
  statusHistory: TaskStatusHistoryEntity[];

  @OneToMany(
    () => SubtaskEntity,
    (subtask: SubtaskEntity) => subtask.parentTask,
    { cascade: true }
  )
  subtasks: SubtaskEntity[];

  get currentTranslator(): UserEntity | undefined {
    return this.assignments?.find(a => a.role === 'translator' && a.status === 'assigned')?.assignedTo;
  }

  get currentReviewer(): UserEntity | undefined {
    return this.assignments?.find(a => a.role === 'reviewer' && a.status === 'assigned')?.assignedTo;
  }

  get currentApprover(): UserEntity | undefined {
    return this.assignments?.find(a => a.role === 'approver' && a.status === 'assigned')?.assignedTo;
  }
}
