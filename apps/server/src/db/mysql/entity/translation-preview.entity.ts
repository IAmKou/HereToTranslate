import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  JoinColumn
} from 'typeorm';
import { RequestEntity } from './request.entity';
import { UserEntity } from './user.entity';

@Entity('translation_previews')
export class TranslationPreviewEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: bigint;

  @ManyToOne(() => RequestEntity, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'requestId' })
  request: RequestEntity;

  @ManyToOne(() => UserEntity, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user: UserEntity;

  @Column({ type: 'json' })
  previewPages: number[];

  @Column({ type: 'text', nullable: true })
  feedback?: string;

  @Column({ type: 'boolean', default: false })
  isApproved: boolean;

  @CreateDateColumn()
  createdAt: Date;
}
