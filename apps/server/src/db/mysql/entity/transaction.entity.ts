import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { UserEntity } from './user.entity';
import { RequestEntity } from './request.entity';

export enum TransactionStatus {
  Pending = 'PENDING',           // Order placed, payment approved
  On_Hold = 'ON_HOLD',    // Translation is happening
  WaitingApproval = 'WAITING_APPROVAL', // Translation done, waiting confirmation
  Approved = 'APPROVED',         // Both parties approved the result
  Completed = 'COMPLETED',       // Payment released to translator
  Failed = 'FAILED',             // Transaction failed due to technical issues
  Cancelled = 'CANCELLED',       // Transaction cancelled by user
  Rejected = 'REJECTED',         // Admin/user actively rejected
}

export enum TransactionType {
  DEPOSIT = 'DEPOSIT',           // User deposits money into system
  PAYMENT = 'PAYMENT',           // Payment between users
  WITHDRAWAL = 'WITHDRAWAL',     // User withdraws money from system
  REFUND = 'REFUND',             // Money refunded to user
  ADMIN_REVIEW = 'ADMIN_REVIEW', // Admin review decision
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

  @Column({ type: 'enum', enum: TransactionType, default: TransactionType.PAYMENT })
  type: TransactionType;

  @Column({ nullable: true })
  paypalOrderId: string;

  @Column({ nullable: true })
  paypalEmail: string;

  @CreateDateColumn()
  createdAt: Date;
}
