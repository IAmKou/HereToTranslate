import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('projectTags')
export class ProjectTagEntity {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id: bigint;

  @Column({ unique: true })
  name: string;
}
