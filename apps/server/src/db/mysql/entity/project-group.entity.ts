import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany } from 'typeorm';
import { ProjectEntity } from './project.entity';
import { GroupMemberEntity } from './group-member.entity';

@Entity('projectgroup')
export class ProjectGroupEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: bigint;

  @Column({ length: 255 })
  name: string;

  @ManyToOne(() => ProjectEntity, project => project.groups)
  project: ProjectEntity;

  @OneToMany(() => GroupMemberEntity, member => member.group)
  members: GroupMemberEntity[];
}
