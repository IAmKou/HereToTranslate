import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import type { WorkflowEntity } from './workflow.entity';
import type { TaskStatusEntity } from './task-status.entity';


export enum TransitionConditionType {
  ROLE = 'role',
  USER = 'user',
  GROUP = 'group',
  ASSIGNEE_ONLY = 'assignee_only',
  CREATOR_ONLY = 'creator_only',
  ANYONE = 'anyone',
}

@Entity('workflow_transition')
export class WorkflowTransitionEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: bigint;

  @Column()
  name: string;

  @ManyToOne(() => require('./workflow.entity').WorkflowEntity, { onDelete: 'CASCADE' })
  workflow: WorkflowEntity;

  @ManyToOne(() => require('./task-status.entity').TaskStatusEntity, { onDelete: 'CASCADE' })
  fromStatus: TaskStatusEntity;

  @ManyToOne(() => require('./task-status.entity').TaskStatusEntity, { onDelete: 'CASCADE' })
  toStatus: TaskStatusEntity;

  @Column({ type: 'enum', enum: TransitionConditionType, default: TransitionConditionType.ANYONE })
  conditionType: TransitionConditionType;

  @Column({ type: 'json', nullable: true })
  conditionData?: any;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;
}