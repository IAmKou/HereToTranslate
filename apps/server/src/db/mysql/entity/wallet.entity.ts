import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn } from 'typeorm';
import { UserEntity } from './user.entity';

@Entity('wallets')
export class WalletEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @OneToOne(() => UserEntity)
  @JoinColumn()
  user: UserEntity;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  balance: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  paypalEmail?: string;
}

