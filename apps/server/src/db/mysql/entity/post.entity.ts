import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, OneToMany } from 'typeorm';
import { UserEntity } from './user.entity';
import { RateEntity } from './rate.entity';
import { CommentEntity } from './comment.entity';

@Entity('posts')
export class PostEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  user: UserEntity;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'enum', enum: ['VISIBLE', 'HIDDEN'], default: 'VISIBLE' })
  visibility: string;

  @CreateDateColumn()
  createdAt: Date;

  @OneToMany(() => RateEntity, rating => rating.post)
  ratings: RateEntity[];

  @OneToMany(() => CommentEntity, comment => comment.post)
  comments: CommentEntity[];
}
