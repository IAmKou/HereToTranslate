import { Column } from 'typeorm';

export class AuthEntity {
  @Column({ type: 'uuid', primary: true })
  sessionId: string;
  @Column({ type: 'bigint', unsigned: true })
  userId: bigint;
  @Column({ type: 'varchar', length: 2000 })
  accessToken: string;
  @Column({ type: 'varchar', length: 2000, nullable: true })
  refreshToken: string;
}
