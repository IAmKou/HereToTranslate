import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { UserEntity } from './user.entity';
import { ProjectEntity } from './project.entity';

@Entity('requests')
export class RequestEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
  requester: UserEntity;

  @ManyToOne(() => ProjectEntity, { nullable: true, onDelete: 'SET NULL' })
  project: ProjectEntity;

  @Column({ nullable: true })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  dealAmount: number;

  @Column({ type: 'date', nullable: true })
  deadline: Date;

  @Column({ type: 'text', nullable: true })
  fileUrl: string;

  @Column({ type: 'enum', enum: ['PENDING', 'APPROVED', 'REJECTED', 'COMPLETED'], default: 'PENDING' })
  status: string;

  @CreateDateColumn()
  createdAt: Date;
}
