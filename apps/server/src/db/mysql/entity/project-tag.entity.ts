import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('projecttag')
export class ProjectTagEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: bigint;

  @Column({ unique: true })
  name: string;
}
