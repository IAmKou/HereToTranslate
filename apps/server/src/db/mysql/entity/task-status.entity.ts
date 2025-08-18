import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { ProjectEntity } from './project.entity';

export enum StatusType {
  OPEN = 'open',
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  DONE = 'done',
  OVERDUE = 'overdue',
  CLOSED = 'closed',
}



@Entity('task_status')
export class TaskStatusEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: bigint;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'varchar', length: 7 })
  color: string;

  @Column({ type: 'enum', enum: StatusType })
  type: StatusType;

  @Column({ type: 'int', default: 0 })
  position: number;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isDefault: boolean;

  @Column({ default: false })
  isStartStatus: boolean;

  @Column({ default: false })
  isEndStatus: boolean;

  @Column({ default: false })
  isResolved: boolean;

  @Column({ default: false })
  isClosed: boolean;

  @ManyToOne(() => ProjectEntity, { onDelete: 'CASCADE' })
  project: ProjectEntity;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
