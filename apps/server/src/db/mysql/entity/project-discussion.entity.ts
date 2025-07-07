import { Column, Entity, JoinColumn, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn, Unique } from "typeorm";
import { ProjectRoleEntity } from "./project-role.entity";
import { BigIntColumnTransformer } from "#LocalProject/Utils/extensions/typeorm.extensions";
import { Permission, PermissionFlags } from "@here-to-translate/common";
import { ProjectEntity } from "./project.entity";
import { UserEntity } from "./user.entity";

@Entity('threads')
export class ProjectDiscussionThreadEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: bigint;

  @ManyToOne(() => ProjectEntity, project => project.discussions, { onDelete: 'CASCADE' })
  project: ProjectEntity;

  @Column({ type: 'national varchar', length: 32 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'boolean', default: false })
  isPinned: boolean;

  @Column({ type: 'boolean', default: false })
  isArchived: boolean;

  @OneToMany(() => ProjectDiscussionCommentEntity, comment => comment.thread, { cascade: true })
  comments: ProjectDiscussionCommentEntity[];

  @OneToMany(() => DiscussionAccessPolicyEntity, policy => policy.thread, { cascade: true })
  accessPolicies: DiscussionAccessPolicyEntity[];
}

@Entity('comments')
@Unique(['thread'])
export class ProjectDiscussionCommentEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: bigint;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  author: UserEntity;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'boolean', default: false })
  isEdited: boolean;

  @ManyToOne(() => ProjectDiscussionThreadEntity, thread => thread.comments)
  thread: ProjectDiscussionThreadEntity;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ type: 'timestamp', nullable: true, default: null })
  editedAt: Date | null;

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
  upvotes: UserEntity[];

  @ManyToOne(() => UserEntity, { nullable: true, onDelete: 'SET NULL' })
  downvotes: UserEntity[];
}

@Entity('thread_access_policies')
@Unique(['thread', 'role'])
export class DiscussionAccessPolicyEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: bigint;

  @ManyToOne(() => ProjectDiscussionThreadEntity, thread => thread.accessPolicies, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'threadId', referencedColumnName: 'id' })
  thread: ProjectDiscussionThreadEntity;

  @ManyToOne(() => ProjectRoleEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'roleId', referencedColumnName: 'id' })
  role: ProjectRoleEntity;

  @Column({
    type: 'bigint',
    unsigned: true,
    default: PermissionFlags.None,
    transformer: BigIntColumnTransformer(Permission)
  })
  denyOverrides: Permission;

  @Column({
    type: 'bigint',
    unsigned: true,
    default: PermissionFlags.None,
    transformer: BigIntColumnTransformer(Permission)
  })
  allowOverrides: Permission;
}
