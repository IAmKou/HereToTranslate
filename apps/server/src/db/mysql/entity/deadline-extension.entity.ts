import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn
} from 'typeorm';
import { RequestEntity } from './request.entity';
import { UserEntity } from './user.entity';

export enum ExtensionStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

@Entity('deadline_extensions')
export class DeadlineExtensionEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: bigint;

  @ManyToOne(() => RequestEntity, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'requestId' })
  request: RequestEntity;

  @ManyToOne(() => UserEntity, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'translatorId' })
  translator: UserEntity;

  @ManyToOne(() => UserEntity, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'requesterId' })
  requester: UserEntity;

  @Column({ type: 'int', unsigned: true })
  requestedDays: number;

  @Column({ type: 'text' })
  reason: string;

  @Column({ type: 'enum', enum: ExtensionStatus, default: ExtensionStatus.PENDING })
  status: ExtensionStatus;

  @Column({ type: 'text', nullable: true })
  rejectionReason?: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'datetime', nullable: true })
  respondedAt?: Date;
}
