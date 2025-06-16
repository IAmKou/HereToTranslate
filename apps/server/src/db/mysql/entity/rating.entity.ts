import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { UserEntity } from './user.entity';
import { PostEntity } from './post.entity';

@Entity('ratings')
export class RatingEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  user: UserEntity;

  @ManyToOne(() => PostEntity, post => post.ratings, { onDelete: 'CASCADE' })
  post: PostEntity;

  @Column({ type: 'tinyint' })
  score: number;

  @CreateDateColumn()
  createdAt: Date;
}
