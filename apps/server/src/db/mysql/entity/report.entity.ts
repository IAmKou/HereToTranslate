import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { UserEntity } from './user.entity';
import { CommentEntity } from './comment.entity';

@Entity('reports')
export class Report {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  reportedBy: UserEntity;

  @ManyToOne(() => CommentEntity, { onDelete: 'CASCADE' })
  comment: CommentEntity;

  @Column({ type: 'enum', enum: ['NEW', 'REVIEWED', 'CANCELLED'], default: 'NEW' })
  status: string;

  @CreateDateColumn()
  createdAt: Date;
}
