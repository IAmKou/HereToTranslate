import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { UserEntity } from './user.entity';
import { RequestEntity } from './request.entity';

export enum TransactionStatus {
  Pending = 'PENDING',
  Completed = 'COMPLETED',
  Failed = 'FAILED',
}

@Entity('transactions')
export class TransactionEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => UserEntity, { nullable: false })
  user: UserEntity;

  @ManyToOne(() => RequestEntity, { nullable: false })
  request: RequestEntity;

  @Column('decimal', { precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'enum', enum: TransactionStatus, default: TransactionStatus.Pending })
  status: TransactionStatus;

  @Column({ nullable: true })
  paypalOrderId: string;

  @CreateDateColumn()
  createdAt: Date;
}
