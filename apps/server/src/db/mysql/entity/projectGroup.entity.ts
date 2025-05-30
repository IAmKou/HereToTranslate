import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany } from 'typeorm';
import { ProjectEntity } from './project.entity';
import { GroupMemberEntity } from './groupMember.entity';

@Entity('project_groups')
export class ProjectGroupEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 255 })
  name: string;

  @ManyToOne(() => ProjectEntity, project => project.groups)
  project: ProjectEntity;

  @OneToMany(() => GroupMemberEntity, member => member.group)
  members: GroupMemberEntity[];
}
