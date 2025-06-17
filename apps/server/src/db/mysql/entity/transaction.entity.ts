import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { UserEntity } from './user.entity';

export enum TransactionType {
  Hold = 'HOLD',
  Transfer = 'TRANSFER',
  Withdraw = 'WITHDRAW',
}
export enum TransactionStatus {
  Pending = 'PENDING',
  Approved = 'APPROVED',
  Disputed = 'DISPUTED',
  Completed = 'COMPLETED',
}

@Entity('transaction')
export class TransactionEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: bigint;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
  fromUser: UserEntity;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
  toUser: UserEntity;

  @Column('decimal', { precision: 12, scale: 2 })
  amount: number;

  @Column({ type: 'enum', enum: TransactionType })
  type: TransactionType;

  @Column({ type: 'enum', enum: TransactionStatus, default: TransactionStatus.Pending })
  status: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
