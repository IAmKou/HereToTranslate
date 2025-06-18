import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
import { UserEntity } from './user.entity';
import { PostEntity } from './post.entity';

@Entity('ratings')
export class RatingEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: bigint;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  user: UserEntity;

  @ManyToOne(() => PostEntity, post => post.ratings, { onDelete: 'CASCADE' })
  post: PostEntity;

  @Column({ type: 'tinyint' })
  score: number;

  @CreateDateColumn()
  createdAt: Date;
}
