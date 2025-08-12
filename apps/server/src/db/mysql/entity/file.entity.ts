import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import type { ProjectEntity } from './project.entity';
import type { BranchEntity } from './branch.entity';
import type { UserEntity } from './user.entity';
import type { RequestEntity } from './request.entity';

@Entity('file')
export class FileEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: bigint;

  @ManyToOne(() => require('./project.entity').ProjectEntity, { nullable: true, onDelete: 'CASCADE' })
  project: ProjectEntity;

  @ManyToOne(() => require('./branch.entity').BranchEntity, { nullable: true, onDelete: 'CASCADE' })
  branch: BranchEntity;

  @ManyToOne(() => require('./user.entity').UserEntity, { nullable: false, onDelete: 'CASCADE' })
  uploader: UserEntity;

  @Column({ type: 'varchar', length: 255, charset: 'utf8mb4', collation: 'utf8mb4_unicode_ci' })
  fileName: string;

  @Column({ type: 'varchar', length: 255, nullable: true, charset: 'utf8mb4', collation: 'utf8mb4_unicode_ci' })
  title?: string;

  @Column({ nullable: true })
  fileType: string;

  @Column({ type: 'longblob', nullable: true })
  fileContent: Buffer;

  @Column({ type: 'longblob', nullable: true })
  compiledContent: Buffer;

  @Column({ type: 'text', nullable: true })
  extractLog?: string;

  @Column({ type: 'varchar', length: 20, default: 'ready', nullable: true })
  status?: 'processing' | 'ready' | 'error';

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => require('./request.entity').RequestEntity, {nullable: true})
  request: RequestEntity;

}
