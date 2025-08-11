import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';
import { ProjectEntity } from './project.entity';
import { UserEntity } from './user.entity';
import { DifficultyLevel } from './page-difficulty.entity';

@Entity('difficulty_config')
@Index(['project', 'difficultyLevel'], { unique: true }) // One config per difficulty level per project
export class DifficultyConfigEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: bigint;

  @ManyToOne(() => ProjectEntity, { onDelete: 'CASCADE' })
  project: ProjectEntity;

  @Column({ type: 'enum', enum: DifficultyLevel })
  difficultyLevel: DifficultyLevel;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 1.0 })
  multiplier: number; // Multiplier for base score

  // Removed basePrice as per new scoring model

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

  @ManyToOne(() => UserEntity, { nullable: false, onDelete: 'CASCADE' })
  createdBy: UserEntity;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
  updatedBy?: UserEntity;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}