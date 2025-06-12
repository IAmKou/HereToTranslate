import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, OneToMany } from 'typeorm';
import { UserEntity } from './user.entity';
import { RateEntity } from './rate.entity';
import { CommentEntity } from './comment.entity';

export enum PostVisibility {
  VISIBLE = 'VISIBLE',
  HIDDEN = 'HIDDEN',
}
@Entity('posts')
export class PostEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  user: UserEntity;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'enum', enum: PostVisibility, default: PostVisibility.VISIBLE })
  visibility: PostVisibility;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => RateEntity, rating => rating.post)
  ratings: RateEntity[];

  @OneToMany(() => CommentEntity, comment => comment.post)
  comments: CommentEntity[];
}
