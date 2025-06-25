import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class AuthEntity {
  @PrimaryGeneratedColumn('uuid')
  sessionId: string;
  @Column({ type: 'bigint', unsigned: true })
  userId: bigint;
  @Column({ type: 'varchar', length: 2000 })
  accessToken: string;
  @Column({ type: 'varchar', length: 2000, nullable: true })
  refreshToken: string;
}
