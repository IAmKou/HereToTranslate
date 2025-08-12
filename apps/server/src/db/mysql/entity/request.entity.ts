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
import { UserEntity } from './user.entity';
import { ProjectEntity } from './project.entity';
import { CategoryEntity } from './category.entity';
import { ProjectTagEntity } from './project-tag.entity';
import { FileEntity } from './file.entity';

export enum RequestStatus {
  Cancelled = 'CANCELLED',
  Pending = 'PENDING',
  Approved = 'APPROVED',
  Rejected = 'REJECTED',
  Completed = 'COMPLETED',
  DeliveryPending = 'DELIVERYPENDING',
  Failed = 'FAILED',
  WaitingApproval = 'WAITING_APPROVAL',
  ExtensionRequested = 'EXTENSION_REQUESTED',
  ExtensionApproved = 'EXTENSION_APPROVED',
  ExtensionRejected = 'EXTENSION_REJECTED',
  CancellationRequested = 'CANCELLATION_REQUESTED',
  CancellationPending = 'CANCELLATION_PENDING',
  Archived = 'ARCHIVED',
}

@Entity('requests')
export class RequestEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: bigint;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'requesterId' })
  requester: UserEntity;

  @ManyToOne(() => ProjectEntity, { nullable: true, onDelete: 'SET NULL' })
  project: ProjectEntity;

  @ManyToMany(() => UserEntity)
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

  @Column({ type: 'date', nullable: true })
  deadline: Date;

  @Column({ type: 'enum', enum: RequestStatus, default: RequestStatus.Pending })
  status: RequestStatus;

  @CreateDateColumn()
  createdAt: Date;

  @Column()
  isPublic: boolean;

  @ManyToOne(() => CategoryEntity, { nullable: true, onDelete: 'SET NULL' })
  category: CategoryEntity;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
  assignee: UserEntity;

  @ManyToMany(() => ProjectTagEntity, { cascade: true })
  @JoinTable({
    joinColumn: { name: 'requestId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'tagId', referencedColumnName: 'id' }
  })
  tags: ProjectTagEntity[];

  @OneToMany(() => FileEntity, file => file.request, {
    cascade: true
  })
  files: FileEntity[];

  @Column({ type: 'json', nullable: true })
  targetLanguages: string[];

}