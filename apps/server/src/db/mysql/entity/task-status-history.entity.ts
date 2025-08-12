import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import type { TaskEntity } from './task.entity';
import type { TaskStatusEntity } from './task-status.entity';
import type { UserEntity } from './user.entity';

@Entity('task_status_history')
export class TaskStatusHistoryEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: bigint;

  @ManyToOne(() => require('./task.entity').TaskEntity, { onDelete: 'CASCADE' })
  task: TaskEntity;

  @ManyToOne(() => require('./task-status.entity').TaskStatusEntity, { nullable: true, onDelete: 'SET NULL' })
  fromStatus?: TaskStatusEntity;

  @ManyToOne(() => require('./task-status.entity').TaskStatusEntity, { onDelete: 'CASCADE' })
  toStatus: TaskStatusEntity;

  @ManyToOne(() => require('./user.entity').UserEntity, { onDelete: 'SET NULL' })
  changedBy: UserEntity;

  @Column({ type: 'text', nullable: true })
  comment?: string;

  @CreateDateColumn()
  createdAt: Date;
}