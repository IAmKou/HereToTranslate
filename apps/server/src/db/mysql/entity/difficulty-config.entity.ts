import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import type { ProjectEntity } from './project.entity';
import type { UserEntity } from './user.entity';
import { DifficultyLevel } from './page-difficulty.entity';

@Entity('difficulty_config')
@Index(['project', 'difficultyLevel'], { unique: true }) // One config per difficulty level per project
export class DifficultyConfigEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: bigint;

  @ManyToOne(() => require('./project.entity').ProjectEntity, { onDelete: 'CASCADE' })
  project: ProjectEntity;

  @Column({ type: 'enum', enum: DifficultyLevel })
  difficultyLevel: DifficultyLevel;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 1.0 })
  multiplier: number; // Multiplier for base score

  @Column({ type: 'varchar', length: 255, nullable: true })
  description?: string;

  @Column({ type: 'json', nullable: true })
  criteria?: {
    textDensity: string;
    technicalTerms: boolean;
    formatting: string;
    specialCharacters: boolean;
    estimatedTimeRange: string;
  };

  @Column({ default: true })
  isActive: boolean;

  @ManyToOne(() => require('./user.entity').UserEntity, { nullable: false, onDelete: 'CASCADE' })
  createdBy: UserEntity;

  @ManyToOne(() => require('./user.entity').UserEntity, { nullable: true, onDelete: 'SET NULL' })
  updatedBy?: UserEntity;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}