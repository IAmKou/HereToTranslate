import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { UserEntity } from './user.entity';
import { ProjectGroupEntity } from './project-group.entity';

export enum TaskStatus {
  Pending = 'PENDING',
  InProgress = 'IN_PROGRESS',
  Completed = 'COMPLETED',
}

@Entity('task')
export class TaskEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: bigint;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'enum', enum: TaskStatus, default: TaskStatus.Pending })
  status: TaskStatus;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
  assignedTo: UserEntity;

  @ManyToOne(() => ProjectGroupEntity, { nullable: true, onDelete: 'SET NULL' })
  group: ProjectGroupEntity;

  @ManyToOne(() => UserEntity, { nullable: false, onDelete: 'CASCADE' })
  createdBy: UserEntity;

  @Column({ type: 'date', nullable: true })
  dueDate: Date;

  @CreateDateColumn()
  createdAt: Date;
}
