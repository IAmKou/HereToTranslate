import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  ManyToMany,
  JoinTable,
  OneToMany,
  JoinColumn
} from 'typeorm';
import type { UserEntity } from './user.entity';
import type { ProjectEntity } from './project.entity';
import type { CategoryEntity } from './category.entity';
import type { ProjectTagEntity } from './project-tag.entity';
import type { FileEntity } from './file.entity';

export enum RequestStatus {
  Cancelled = 'CANCELLED',
  Pending = 'PENDING',
  Approved = 'APPROVED',
  Rejected = 'REJECTED',
  Completed = 'COMPLETED',
  Incompleted = 'INCOMPLETED',
  DeliveryPending = 'DELIVERYPENDING',
  Failed = 'FAILED',
  WaitingApproval = 'WAITING_APPROVAL',
  ExtensionRequested = 'EXTENSION_REQUESTED',
  ExtensionApproved = 'EXTENSION_APPROVED',
  ExtensionRejected = 'EXTENSION_REJECTED',
  CancellationRequested = 'CANCELLATION_REQUESTED',
  CancellationPending = 'CANCELLATION_PENDING',
  Archived = 'ARCHIVED',
  PendingAdminReview = 'PENDING_ADMIN_REVIEW',
  AdminReviewed = 'ADMIN_REVIEWED',
}

@Entity('requests')
export class RequestEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: bigint;

  @ManyToOne(() => require('./user.entity').UserEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'requesterId' })
  requester: UserEntity;

  @ManyToOne(() => require('./project.entity').ProjectEntity, { nullable: true, onDelete: 'SET NULL' })
  project: ProjectEntity;

  @ManyToMany(() => require('./user.entity').UserEntity)
  @JoinTable({
    name: 'request_registrants',
    joinColumn: { name: 'request_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'user_id', referencedColumnName: 'id' },
  })
  registrants: UserEntity[];

  @Column({ nullable: true })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  dealAmount: number;

  @Column({ type: 'date', nullable: true, transformer: {
      to: (value: Date) => value,
      from: (value: string | Date) => value ? new Date(value) : null
    }})
  deadline: Date;

  @Column({ type: 'enum', enum: RequestStatus, default: RequestStatus.Pending })
  status: RequestStatus;

  @CreateDateColumn()
  createdAt: Date;

  @Column()
  isPublic: boolean;

  @ManyToOne(() => require('./category.entity').CategoryEntity, { nullable: true, onDelete: 'SET NULL' })
  category: CategoryEntity;

  @ManyToOne(() => require('./user.entity').UserEntity, { nullable: true, onDelete: 'SET NULL' })
  assignee: UserEntity;

  @ManyToMany(() => require('./project-tag.entity').ProjectTagEntity, { cascade: true })
  @JoinTable({
    joinColumn: { name: 'requestId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'tagId', referencedColumnName: 'id' }
  })
  tags: ProjectTagEntity[];

  @OneToMany(() => require('./file.entity').FileEntity, (file: FileEntity) => file.request, {
    cascade: true
  })
  files: FileEntity[];

  @Column({ type: 'json', nullable: true })
  targetLanguages: string[];

  @Column({ type: 'int', nullable: true, comment: 'Rating from 1-5 stars given by requester to translator' })
  rating: number;

  // Review fields
  @Column({ type: 'datetime', nullable: true, comment: 'When the request was reviewed' })
  reviewedAt: Date;

  @Column({ type: 'enum', enum: ['APPROVED', 'REJECTED'], nullable: true, comment: 'Review decision' })
  reviewDecision: 'APPROVED' | 'REJECTED';

  @Column({ type: 'int', nullable: true, comment: 'Review rating from 1-5 stars' })
  reviewRating: number;

  @Column({ type: 'text', nullable: true, comment: 'Review comment from requester' })
  reviewComment: string;

  @Column({ type: 'text', nullable: true, comment: 'Reason for rejection when translation is 100% completed' })
  rejectionReason: string;

  // Admin review fields
  @Column({ type: 'datetime', nullable: true, comment: 'When admin reviewed the request' })
  adminReviewedAt: Date;

  @Column({ type: 'bigint', unsigned: true, nullable: true, comment: 'Admin user ID who reviewed' })
  adminReviewedBy: bigint;

  @Column({ type: 'enum', enum: ['APPROVE_TRANSLATOR', 'APPROVE_REQUESTER'], nullable: true, comment: 'Admin decision' })
  adminReviewDecision: 'APPROVE_TRANSLATOR' | 'APPROVE_REQUESTER';

  @Column({ type: 'text', nullable: true, comment: 'Admin reason for decision' })
  adminReviewReason: string;

  @Column({ type: 'text', nullable: true, comment: 'Admin notes for internal use' })
  adminReviewNotes: string;

}
