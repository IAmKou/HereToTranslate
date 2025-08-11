import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { TaskEntity } from './task.entity';
import { UserEntity } from './user.entity';

@Entity('task_history')
export class TaskHistoryEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'task_id', type: 'bigint', unsigned: true })
  taskId: bigint;

  @Column({ name: 'action', type: 'varchar', length: 50 })
  action: 'created' | 'status_change' | 'assignment_change' | 'due_date_change' | 'closed' | 'reopened';

  @Column({ name: 'description', type: 'text' })
  description: string;

  @Column({ name: 'reason', type: 'text', nullable: true })
  reason?: string;

  @Column({ name: 'metadata', type: 'json', nullable: true })
  metadata?: any;

  @Column({ name: 'performed_by', type: 'bigint', unsigned: true })
  performedBy: bigint;

  @CreateDateColumn({ name: 'performed_at' })
  performedAt: Date;

  @ManyToOne(() => TaskEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'task_id' })
  task: TaskEntity;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'performed_by' })
  performer: UserEntity;
}
