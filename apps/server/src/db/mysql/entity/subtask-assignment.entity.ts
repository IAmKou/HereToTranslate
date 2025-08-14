import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    CreateDateColumn,
    UpdateDateColumn,
    Index,
  } from 'typeorm';
  import { SubtaskEntity } from './subtask.entity';
  import { UserEntity } from './user.entity';
  
  export enum SubtaskAssignmentRole {
    TRANSLATOR = 'translator',
    REVIEWER = 'reviewer',
    APPROVER = 'approver',
  }
  
  export enum SubtaskAssignmentStatus {
    ASSIGNED = 'assigned',
    REASSIGNED = 'reassigned',
    ACCEPTED = 'accepted',
    DECLINED = 'declined',
    COMPLETED = 'completed',
    CANCELLED = 'cancelled',
  }
  
  @Entity('subtask_assignment')
  @Index(['subtask', 'role'], { unique: true }) // One assignment per role per subtask
  export class SubtaskAssignmentEntity {
    @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
    id: bigint;
  
    @ManyToOne(() => require('./subtask.entity').SubtaskEntity, { onDelete: 'CASCADE' })
    subtask: SubtaskEntity;
  
    @ManyToOne(() => UserEntity, { nullable: false, onDelete: 'CASCADE' })
    assignedTo: UserEntity;
  
    @Column({ type: 'enum', enum: SubtaskAssignmentRole })
    role: SubtaskAssignmentRole;
  
    @Column({ type: 'enum', enum: SubtaskAssignmentStatus, default: SubtaskAssignmentStatus.ASSIGNED })
    status: SubtaskAssignmentStatus;
  
    @Column({ type: 'text', nullable: true })
    notes?: string;
  
    @Column({ type: 'datetime', nullable: true })
    dueDate?: Date;
  
    @Column({ type: 'json', nullable: true })
    workData?: {
      pagesAssigned: number[];
      estimatedHours: number;
      actualHours?: number;
    };
  
    @ManyToOne(() => UserEntity, { nullable: false, onDelete: 'CASCADE' })
    assignedBy: UserEntity;
  
    @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
    reassignedBy?: UserEntity;
  
    @Column({ type: 'datetime', nullable: true })
    reassignedAt?: Date;
  
    @Column({ type: 'text', nullable: true })
    reassignmentReason?: string;
  
    @CreateDateColumn()
    createdAt: Date;
  
    @UpdateDateColumn()
    updatedAt: Date;
  }
  