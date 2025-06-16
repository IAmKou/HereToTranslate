import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, OneToMany } from 'typeorm';
import { ProjectEntity } from './project.entity';
import { UserEntity } from './user.entity';
import { CommitEntity } from './commit.entity';
import { FileEntity } from './file.entity';

@Entity('branches')
export class BranchEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: bigint;

  @ManyToOne(() => ProjectEntity, project => project.id, { nullable: false, onDelete: 'CASCADE' })
  project: ProjectEntity

  @Column({ length: 100 })
  name: string;

  @ManyToOne(() => UserEntity, user => user.id, { nullable: false, onDelete: 'CASCADE' })
  user: UserEntity;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => CommitEntity, commit => commit.branch)
  commits: CommitEntity[];

  @OneToMany(() => FileEntity, file => file.branch)
  files: FileEntity[];

}
