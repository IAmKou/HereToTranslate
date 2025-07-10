import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { UserEntity } from './user.entity';

export enum ReportStatus {
  New = 'NEW',
  Reviewed = 'REVIEWED',
  Cancelled = 'CANCELLED',
}

@Entity('reports')
export class ReportEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: bigint;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  reportedBy: UserEntity;

  @Column({ type: 'enum', enum: ReportStatus, default: ReportStatus.New })
  status: ReportStatus;

  @CreateDateColumn()
  createdAt: Date;
}
