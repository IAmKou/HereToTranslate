import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    ManyToOne,
    CreateDateColumn,
    UpdateDateColumn,
  } from 'typeorm';
  import { TaskEntity } from './task.entity';
  import { UserEntity } from './user.entity';
  @Entity('task_comment')
  export class TaskCommentEntity {
    @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
    id: bigint;
  
    @Column({ type: 'text' })
    content: string;
  
    @ManyToOne(() => TaskEntity, { onDelete: 'CASCADE' })
    task: TaskEntity;
  
    @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
    author: UserEntity;
  
    @ManyToOne(() => TaskCommentEntity, { nullable: true, onDelete: 'CASCADE' })
    parentComment?: TaskCommentEntity;
  
    @Column({ default: false })
    isEdited: boolean;
  
    @Column({ type: 'json', nullable: true })
    attachments?: Array<{
      id: string;
      fileName: string;
      fileUrl: string;
      fileSize: number;
      mimeType: string;
    }>;
  
    @Column({ type: 'json', nullable: true })
    mentions?: Array<{
      userId: string;
      username: string;
      startIndex: number;
      endIndex: number;
    }>;
  
    @CreateDateColumn()
    createdAt: Date;
  
    @UpdateDateColumn()
    updatedAt: Date;
  }