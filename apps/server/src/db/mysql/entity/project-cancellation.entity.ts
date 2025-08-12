import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    CreateDateColumn,
    UpdateDateColumn,
    JoinColumn
  } from 'typeorm';
  import { ProjectEntity } from './project.entity';
  import { RequestEntity } from './request.entity';
  import { UserEntity } from './user.entity';
  
  export enum CancellationType {
    REQUESTER_INITIATED = 'REQUESTER_INITIATED',
    TRANSLATOR_INITIATED = 'TRANSLATOR_INITIATED',
  }
  
  export enum CancellationStatus {
    PENDING = 'PENDING',
    CONFIRMED = 'CONFIRMED',
    REJECTED = 'REJECTED',
    COMPLETED = 'COMPLETED',
  }
  
  @Entity('project_cancellations')
  export class ProjectCancellationEntity {
    @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
    id: bigint;
  
    @ManyToOne(() => ProjectEntity, { nullable: false, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'projectId' })
    project: ProjectEntity;
  
    @ManyToOne(() => RequestEntity, { nullable: false, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'requestId' })
    request: RequestEntity;
  
    @ManyToOne(() => UserEntity, { nullable: false, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'initiatorId' })
    initiator: UserEntity;
  
    @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'CASCADE' })
    @JoinColumn({ name: 'responderId' })
    responder?: UserEntity;
  
    @Column({ type: 'enum', enum: CancellationType })
    cancellationType: CancellationType;
  
    @Column({ type: 'enum', enum: CancellationStatus, default: CancellationStatus.PENDING })
    status: CancellationStatus;
  
    @Column({ type: 'text' })
    reason: string;
  
    @Column({ type: 'text', nullable: true })
    responseReason?: string;
  
    @Column({ type: 'boolean', default: false })
    requiresConfirmation: boolean;
  
    @Column({ type: 'boolean', default: false })
    isArchiveOnly: boolean;
  
    @CreateDateColumn()
    createdAt: Date;
  
    @UpdateDateColumn()
    updatedAt: Date;
  
    @Column({ type: 'datetime', nullable: true })
    respondedAt?: Date;
  
    @Column({ type: 'datetime', nullable: true })
    completedAt?: Date;
  }