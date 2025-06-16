import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('project_tags')
export class ProjectTagEntity {
  @PrimaryGeneratedColumn()
  id: bigint;

  @Column({ unique: true })
  name: string;
}
