import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { ProjectEntity } from './project.entity';
import { GroupMemberEntity } from './groupMember.entity';

@Entity('project_groups')
export class ProjectGroupEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255 })
  name: string;

  @Column({ name: 'project_id' })
  projectId: number;

  @ManyToOne(() => ProjectEntity, project => project.groups)
  @JoinColumn({ name: 'project_id' })
  project: ProjectEntity;

  @OneToMany(() => GroupMemberEntity, member => member.group)
  members: GroupMemberEntity[];
}
