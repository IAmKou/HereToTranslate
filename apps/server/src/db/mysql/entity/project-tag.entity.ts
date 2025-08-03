import { Entity, PrimaryGeneratedColumn, Column, ManyToMany } from 'typeorm';
import { ProjectEntity } from './project.entity';

@Entity('projecttag')
export class ProjectTagEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: bigint;

  @Column({ unique: true })
  name: string;

  @ManyToMany(() => ProjectEntity, project => project.tags,{

  })
  projects: ProjectEntity[];
}
