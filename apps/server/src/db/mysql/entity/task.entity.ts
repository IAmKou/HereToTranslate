import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { UserEntity } from './user.entity';
import { ProjectGroupEntity } from './project-group.entity';
import { TaskStatusEntity } from './task-status.entity';
import { WorkflowEntity } from './workflow.entity';
import { TaskAssignmentEntity } from './task-assignment.entity';
import { PageDifficultyEntity } from './page-difficulty.entity';

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

  @Column({ type: 'int', nullable: true })
  filePart?: number;

  @Column({ type: 'varchar', length: 10, nullable: true })
  language?: string;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
  assignedTo?: UserEntity;

  @ManyToOne(() => ProjectGroupEntity, { nullable: true, onDelete: 'SET NULL' })
  group?: ProjectGroupEntity;

  @ManyToOne(() => UserEntity, { nullable: false, onDelete: 'CASCADE' })
  createdBy: UserEntity;

  @Column({ type: 'datetime', nullable: true })
  dueDate: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'datetime', nullable: true })
  startedAt?: Date;

  @Column({ type: 'datetime', nullable: true })
  completedAt?: Date;

  @Column({ type: 'json', nullable: true })
  customFields?: Record<string, any>;

  @Column({ type: 'enum', enum: ['lowest', 'low', 'medium', 'high', 'highest'], default: 'medium' })
  priority: string;

  @Column({ type: 'int', nullable: true })
  storyPoints?: number;

  // New fields for pagination & scoring
  @Column({ type: 'json', nullable: true })
  selectedPages?: number[]; // Array of selected page numbers

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalScore: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalAmount: number;

  @Column({ type: 'int', default: 0 })
  totalPages: number;

  // Assignment relationships
  @OneToMany(() => TaskAssignmentEntity, assignment => assignment.task, { cascade: true })
  assignments: TaskAssignmentEntity[];

  // Note: PageDifficultyEntity is related by fileId, not directly to task
  // This would need to be fetched separately using fileId

  // Quick access to current assignments (computed from assignments)
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
