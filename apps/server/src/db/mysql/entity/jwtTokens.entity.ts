import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn
} from 'typeorm';
import {UserEntity} from './user.entity';

@Entity('jwtTokens')
export class JwtTokenEntity {

  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => UserEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: UserEntity;

  @Column('text', { unique: true })
  token: string;

  @CreateDateColumn({ nullable: false})
  createdAt: Date;

  @UpdateDateColumn({ nullable: false})
  lastUsedAt: Date;

  @Column({ default: false })
  isUsed: boolean;

  @Column()
  expiresAt: Date;

}
