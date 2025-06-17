import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { ProjectEntity } from './project.entity';
import { BranchEntity } from './branch.entity';
import { UserEntity } from './user.entity';

@Entity('file')
export class FileEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: bigint;

  @ManyToOne(() => ProjectEntity, { nullable: true, onDelete: 'SET NULL' })
  project: ProjectEntity;

  @ManyToOne(() => BranchEntity, { nullable: true, onDelete: 'SET NULL' })
  branch: BranchEntity;

  @ManyToOne(() => UserEntity, { nullable: false, onDelete: 'CASCADE' })
  uploader: UserEntity;

  @Column()
  fileName: string;

  @Column({ nullable: true })
  fileType: string;

  @Column({ type: 'longblob', nullable: true })
  fileContent: Buffer;

  @Column({ type: 'longblob', nullable: true })
  compiledContent: Buffer;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
