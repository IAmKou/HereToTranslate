import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, JoinColumn } from 'typeorm';
import { UserEntity } from './user.entity';
import { ProjectEntity } from './project.entity';

@Entity('requests')
export class RequestEntity {
  @PrimaryGeneratedColumn()
  id: bigint;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'requester_id' })
  requester: UserEntity;

  @ManyToOne(() => ProjectEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'project_id' })
  project: ProjectEntity;

  @Column({ nullable: true })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  deal_amount: number;

  @Column({ type: 'date', nullable: true })
  deadline: Date;

  @Column({ type: 'text', nullable: true })
  file_url: string;

  @Column({ type: 'enum', enum: ['PENDING', 'APPROVED', 'REJECTED', 'COMPLETED'], default: 'PENDING' })
  status: string;

  @CreateDateColumn()
  created_at: Date;
}
