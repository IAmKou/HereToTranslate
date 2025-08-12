import { Entity, PrimaryGeneratedColumn, Column, ManyToMany } from 'typeorm';
import type { ProjectEntity } from './project.entity';

@Entity('projecttag')
export class ProjectTagEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: bigint;

  @Column({ unique: true })
  name: string;

  @ManyToMany(() => require('./project.entity').ProjectEntity, (project: ProjectEntity) => project.tags,{

  })
  projects: ProjectEntity[];
}
