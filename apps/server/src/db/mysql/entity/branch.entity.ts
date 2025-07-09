import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  OneToMany,
  ManyToMany,
  JoinTable
} from 'typeorm';
import { ProjectEntity } from './project.entity';
import { UserEntity } from './user.entity';
import { CommitEntity } from './commit.entity';
import { FileEntity } from './file.entity';
import { ProjectRoleEntity } from './project-role.entity';

@Entity('branches')
export class BranchEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
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

  @ManyToMany(() => ProjectRoleEntity, { cascade: true })
  @JoinTable({
    name: 'branch_visible_roles',
    joinColumn: { name: 'branchId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'roleId', referencedColumnName: 'id' },
  })
  visibleToRoles?: ProjectRoleEntity[];


}
