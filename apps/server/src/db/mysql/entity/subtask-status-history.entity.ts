import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { SubtaskEntity } from './subtask.entity';
import { TaskStatusEntity } from './task-status.entity';
import { UserEntity } from './user.entity';

@Entity('subtask_status_history')
export class SubtaskStatusHistoryEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: bigint;

  @ManyToOne(() => require('./subtask.entity').SubtaskEntity, { onDelete: 'CASCADE' })
  subtask: SubtaskEntity;

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
