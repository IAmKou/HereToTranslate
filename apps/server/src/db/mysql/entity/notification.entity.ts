import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { UserEntity } from './user.entity';

@Entity('notification')
export class NotificationEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: bigint;

  @Column({ type: 'bigint', unsigned: true, nullable: true })
  userId: bigint;

  @Column({ type: 'varchar', length: 50 })
  type: string;

  @Column({ type: 'text', nullable: true })
  message: string;

  @Column({ type: 'boolean', default: false })
  isGlobal: boolean;

  @Column({ type: 'bigint', unsigned: true, nullable: true })
  createdBy: bigint;

  @Column({ type: 'boolean', default: false })
  isRead: boolean;

  @Column({ type: 'datetime', nullable: true })
  readAt: Date;

  @CreateDateColumn({ type: 'datetime' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'datetime' })
  updatedAt: Date;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: UserEntity;

  @ManyToOne(() => UserEntity, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'createdBy' })
  creator: UserEntity;
}
