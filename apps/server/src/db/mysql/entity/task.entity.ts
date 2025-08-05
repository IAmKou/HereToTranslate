import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { UserEntity } from './user.entity';
import { ProjectGroupEntity } from './project-group.entity';

export enum TaskStatus {
  Pending = 'pending',
  InProgress = 'in_progress',
  Completed = 'completed',
  Closed = 'closed',
}

@Entity('task')
export class TaskEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: bigint;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'enum', enum: TaskStatus, default: TaskStatus.Pending })
  status: TaskStatus;

  @Column({ type: 'varchar', nullable: true })
  projectId?: string;

  @Column({ type: 'varchar', nullable: true })
  branchId?: string;

  @Column({ type: 'varchar', nullable: true })
  fileId?: string;

  @Column({ type: 'int', nullable: true })
  page?: number;

  @Column({ type: 'json', nullable: true })
  pages?: number[];

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

  @Column({ type: 'datetime', nullable: true })
  startedAt?: Date;

  @Column({ type: 'datetime', nullable: true })
  completedAt?: Date;
}

