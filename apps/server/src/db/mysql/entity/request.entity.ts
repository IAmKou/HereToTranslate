import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { UserEntity } from './user.entity';
import { ProjectEntity } from './project.entity';

export enum RequestStatus {
  Cancelled = 'CANCELLED',
  Pending = 'PENDING',
  Approved = 'APPROVED',
  Rejected = 'REJECTED',
  Completed = 'COMPLETED',
}

@Entity('requests')
export class RequestEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: bigint;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
  requester: UserEntity;

  @ManyToOne(() => ProjectEntity, { nullable: true, onDelete: 'SET NULL' })
  project: ProjectEntity;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
  assignee: UserEntity;

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
}
