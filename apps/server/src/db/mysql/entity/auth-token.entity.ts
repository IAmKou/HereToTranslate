import { Column, Entity, PrimaryGeneratedColumn, Index, ManyToOne, JoinColumn } from 'typeorm';
import { UserEntity } from './user.entity';

@Entity('auth_tokens')
export class AuthTokenEntity {
  @PrimaryGeneratedColumn('uuid')
  sessionId: string;

  @Column({ type: 'bigint', unsigned: true })
  userId: bigint;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'userId', referencedColumnName: 'id' })
  user: UserEntity;

  @Column({ type: 'varchar', length: 512 })
  @Index()
  accessToken: string;

  @Column({ type: 'varchar', length: 512, nullable: true })
  @Index()
  refreshToken: string;

  @Column({ type: 'datetime', nullable: false })
  accessTokenExpiresAt: Date;

  @Column({ type: 'datetime', nullable: true })
  refreshTokenExpiresAt: Date;

  @Column({ type: 'datetime', nullable: false })
  lastActivityAt: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}
