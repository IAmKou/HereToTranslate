import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { UserEntity } from './user.entity';

export enum DifficultyLevel {
  SIMPLE = 'simple',
  MEDIUM = 'medium',
  COMPLEX = 'complex',
  VERY_COMPLEX = 'very_complex',
}

@Entity('page_difficulty')
@Index(['fileId', 'pageNumber'], { unique: true }) // Prevent duplicate page assignments
@Index(['fileId', 'hash'], { unique: true, where: 'hash IS NOT NULL' }) // Prevent duplicate pages by content
export class PageDifficultyEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: bigint;

  @Column({ type: 'varchar' })
  projectId: string;

  @Column({ type: 'varchar' })
  branchId: string;

  @Column({ type: 'varchar' })
  fileId: string;

  @Column({ type: 'varchar', length: 128, nullable: true })
  hash?: string; // Hash of page content for duplicate detection

  @Column({ type: 'int' })
  pageNumber: number;

  @Column({ type: 'int' })
  filePart: number; // Maps to filePart in translation schema

  @Column({ type: 'enum', enum: DifficultyLevel, default: DifficultyLevel.SIMPLE })
  difficultyLevel: DifficultyLevel;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  baseScore: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  calculatedScore: number; // baseScore * difficulty multiplier

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ type: 'json', nullable: true })
  previewData?: {
    textCount: number;
    complexity: string;
    estimatedTime: number;
  };

  @ManyToOne(() => UserEntity, { nullable: false, onDelete: 'CASCADE' })
  assignedBy: UserEntity;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
  reviewedBy?: UserEntity;

  @Column({ type: 'datetime', nullable: true })
  reviewedAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}