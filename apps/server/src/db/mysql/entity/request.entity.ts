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

  @Column({ nullable: true })
  sourceLanguage: string;

  @Column({ type: 'int', nullable: true, default: 0 })
  totalWordCount: number;

}
