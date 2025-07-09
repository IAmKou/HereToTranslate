import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, OneToMany } from 'typeorm';
import { UserEntity } from './user.entity';
import { RatingEntity } from './rating.entity';
// import { CommentEntity } from './discussion.entity';

export enum PostVisibility {
  Visible = 'VISIBLE',
  Hidden = 'HIDDEN',
}
@Entity('posts')
export class PostEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: bigint;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  user: UserEntity;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'enum', enum: PostVisibility, default: PostVisibility.Visible })
  visibility: PostVisibility;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => RatingEntity, rating => rating.post)
  ratings: RatingEntity[];

//   @OneToMany(() => CommentEntity, comment => comment.post)
//   comments: CommentEntity[];
 }
