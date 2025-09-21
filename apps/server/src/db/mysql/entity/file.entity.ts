import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import type { ProjectEntity } from './project.entity';
import type { UserEntity } from './user.entity';
import type { RequestEntity } from './request.entity';
import { TranslationEntity } from './translation.entity';

@Entity('file')
export class FileEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: bigint;

  @ManyToOne(() => require('./project.entity').ProjectEntity, { nullable: true, onDelete: 'CASCADE' })
  project: ProjectEntity;


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

  @Column({ type: 'boolean', default: false })
  isSyncedFromRequest: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => require('./request.entity').RequestEntity, {nullable: true})
  request: RequestEntity;

    @OneToMany(() => require('./translation.entity').TranslationEntity, (translation: TranslationEntity) => translation.file, { onDelete: 'CASCADE' })
    translations: TranslationEntity[];

}
