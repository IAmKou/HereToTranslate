import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { TaskEntity } from './task.entity';
import { TaskStatusEntity } from './task-status.entity';
import { UserEntity } from './user.entity';

@Entity('task_status_history')
export class TaskStatusHistoryEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: bigint;

  @ManyToOne(() => TaskEntity, { onDelete: 'CASCADE' })
  task: TaskEntity;

  @ManyToOne(() => TaskStatusEntity, { nullable: true, onDelete: 'SET NULL' })
  fromStatus?: TaskStatusEntity;

  @ManyToOne(() => TaskStatusEntity, { onDelete: 'CASCADE' })
  toStatus: TaskStatusEntity;

  @ManyToOne(() => UserEntity, { onDelete: 'SET NULL' })
  changedBy: UserEntity;

  @Column({ type: 'text', nullable: true })
  comment?: string;

  @CreateDateColumn()
  createdAt: Date;
}