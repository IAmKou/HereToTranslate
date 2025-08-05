// task.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { UserEntity } from './user.entity';
import { ProjectGroupEntity } from './project-group.entity';
import { TaskStatusEntity } from './task-status.entity';
import { WorkflowEntity } from './workflow.entity';

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
}
