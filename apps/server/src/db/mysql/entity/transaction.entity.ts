import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { UserEntity } from './user.entity';
import { RequestEntity } from './request.entity';

export enum TransactionStatus {
  Pending = 'PENDING',           // Order placed, payment approved
  InProgress = 'IN_PROGRESS',    // Translation is happening
  WaitingApproval = 'WAITING_APPROVAL', // Translation done, waiting confirmation
  Approved = 'APPROVED',         // Both parties approved the result
  Completed = 'COMPLETED',       // Payment released to translator
  Failed = 'FAILED',
  Rejected = 'REJECTED',         // Admin/user actively rejected
}


@Entity('transactions')
export class TransactionEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => UserEntity, { nullable: false })
  user: UserEntity;

  @ManyToOne(() => RequestEntity, { nullable: true, onDelete: 'SET NULL' })
  request: RequestEntity;

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'enum', enum: TransactionStatus, default: TransactionStatus.Pending })
  status: TransactionStatus;

  @Column({ nullable: true })
  paypalOrderId: string;

  @Column({ nullable: true })
  paypalEmail: string;

  @CreateDateColumn()
  createdAt: Date;
}
