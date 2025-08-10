import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

export enum ActivityType {
  FILE_UPLOAD = 'file_upload',
  FILE_DELETE = 'file_delete',
  TRANSLATION_ADD = 'translation_add',
  TRANSLATION_EDIT = 'translation_edit',
  TASK_CREATE = 'task_create',
  TASK_STATUS_CHANGE = 'task_status_change',
  MEMBER_ADD = 'member_add',
  MEMBER_REMOVE = 'member_remove',
  MEMBER_JOIN = 'member_join',
  ROLE_CHANGE = 'role_change',
  PROJECT_UPDATE = 'project_update',
  DISCUSSION_CREATE = 'discussion_create',
  DISCUSSION_REPLY = 'discussion_reply',
  COMMIT_CREATE = 'commit_create',
  BRANCH_CREATE = 'branch_create',
  BRANCH_DELETE = 'branch_delete'
}

@Entity('project_activities')
@Index(['projectId', 'createdAt'])
@Index(['userId', 'createdAt'])
@Index(['type', 'createdAt'])
export class ProjectActivity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'bigint', unsigned: true })
  projectId: number;

  @Column({ type: 'bigint', unsigned: true, nullable: true })
  userId: number;

  @Column({ type: 'bigint', unsigned: true, nullable: true })
  branchId: number;

  @Column({
    type: 'enum',
    enum: ActivityType,
    nullable: false
  })
  type: ActivityType;

  @Column({ type: 'json', nullable: true })
  details: Record<string, any>;

  @Column({ type: 'boolean', default: false })
  canUndo: boolean;

  @Column({ type: 'json', nullable: true })
  undoData: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;
}
