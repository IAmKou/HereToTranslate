import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { UserEntity } from './user.entity';

@Entity('transaction')
export class TransactionEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
  fromUser: UserEntity;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
  toUser: UserEntity;

  @Column('decimal', { precision: 12, scale: 2 })
  amount: number;

  @Column({ type: 'enum', enum: ['hold', 'transfer', 'withdraw'] })
  type: string;

  @Column({ type: 'enum', enum: ['pending', 'approved', 'disputed', 'completed'] })
  status: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
