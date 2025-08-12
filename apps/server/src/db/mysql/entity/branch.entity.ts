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
import type { ProjectEntity } from './project.entity';
import type { UserEntity } from './user.entity';
import type { CommitEntity } from './commit.entity';
import type { FileEntity } from './file.entity';
import type { ProjectRoleEntity } from './project-role.entity';

@Entity('branches')
export class BranchEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: bigint;

  @ManyToOne(() => require('./project.entity').ProjectEntity, (project: ProjectEntity) => project.id, { nullable: false, onDelete: 'CASCADE' })
  project: ProjectEntity

  @Column({ length: 100 })
  name: string;

  @ManyToOne(() => require('./user.entity').UserEntity, (user: UserEntity) => user.id, { nullable: false, onDelete: 'CASCADE' })
  user: UserEntity;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => require('./commit.entity').CommitEntity, (commit: CommitEntity) => commit.branch)
  commits: CommitEntity[];

  @OneToMany(() => require('./file.entity').FileEntity, (file: FileEntity) => file.branch)
  files: FileEntity[];

  @ManyToMany(() => require('./project-role.entity').ProjectRoleEntity, { cascade: true })
  @JoinTable({
    name: 'branch_visible_roles',
    joinColumn: { name: 'branchId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'roleId', referencedColumnName: 'id' },
  })
  visibleToRoles?: ProjectRoleEntity[];


}
