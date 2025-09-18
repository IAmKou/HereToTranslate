import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    CreateDateColumn,
    JoinColumn,
    Unique
  } from 'typeorm';
  import type { RequestEntity } from './request.entity';
  import type { UserEntity } from './user.entity';
  
  export enum ReviewStatus {
    Success = 'SUCCESS',
    Failed = 'FAILED',
    Cancelled = 'CANCELLED'
  }
  
  @Entity('request_reviews')
  @Unique(['request', 'reviewer']) 
  export class RequestReviewEntity {
    @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
    id: bigint;
  
    @ManyToOne(() => require('./request.entity').RequestEntity, (request: RequestEntity) => request.id, {
      nullable: false,
      onDelete: 'CASCADE'
    })
    @JoinColumn({ name: 'requestId' })
    request: RequestEntity;
  
    @ManyToOne(() => require('./user.entity').UserEntity, (user: UserEntity) => user.id, {
      nullable: false,
      onDelete: 'CASCADE'
    })
    @JoinColumn({ name: 'reviewerId' })
    reviewer: UserEntity;
  
    @Column({ type: 'tinyint', unsigned: true })
    starRating: number; 
  
    @Column({ type: 'text', nullable: true })
    comment: string;
  
    @Column({ type: 'enum', enum: ReviewStatus })
    status: ReviewStatus;
  
    @CreateDateColumn()
    createdAt: Date;
  }
  