import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
  Index
} from 'typeorm';
import { RequestEntity } from './request.entity';
import { FileEntity } from './file.entity';
import { ProjectEntity } from './project.entity';

@Entity('translations')
@Index(['fileId', 'language'])
@Index(['requestId', 'language'])
export class TranslationEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: bigint;

  @ManyToOne(() => RequestEntity, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'requestId' })
  request: RequestEntity;

  @Column({ type: 'bigint', unsigned: true, nullable: true })
  requestId: string | null;

  @ManyToOne(() => ProjectEntity, { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'projectId' })
  project: ProjectEntity;

  @Column({ type: 'bigint', unsigned: true, nullable: true })
  projectId: bigint | null;

  @ManyToOne(() => FileEntity, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'fileId' })
  file: FileEntity;

  @Column({ type: 'bigint', unsigned: true })
  fileId: bigint | null;

  @Column({ nullable: true })
  filePart: number;

  @Column({ type: 'text' })
  originalText: string;

  @Column({ type: 'text', nullable: true })
  translatedText: string;

  @Column({ type: 'varchar', length: 10 })
  language: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  targetLanguage: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  fontFamily: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  fontSize: number;

  @Column({ type: 'json', nullable: true })
  style: Record<string, unknown>;

  @Column({ type: 'json', nullable: true })
  position: {
    x: number;
    y: number;
    width?: number;
    height?: number;
  } | null;

  @Column({ type: 'int', default: 0 })
  orderIndex: number;

  @Column({ type: 'varchar', length: 50, default: 'pending' })
  status: string; // pending, translated, reviewed, approved

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, unknown>;

  @Column({ type: 'int', nullable: true })
  paragraphIndex: number;

  @Column({ type: 'int', nullable: true })
  runIndex: number;

  @Column({ type: 'json', nullable: true })
  runs: Array<{
    text: string;
    fontInfo: {
      family?: string;
      size?: number;
      bold?: boolean;
      italic?: boolean;
      underline?: boolean;
      color?: string;
    };
  }> | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
