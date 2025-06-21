import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, ManyToMany, JoinTable } from 'typeorm';
import { ProjectEntity } from './project.entity';
import { UserEntity } from './user.entity';

@Entity('projectgroup')
export class ProjectGroupEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: bigint;

  @Column({ length: 255 })
  name: string;

  @ManyToOne(() => ProjectEntity, project => project.groups)
  project: ProjectEntity;

  @ManyToMany(() => UserEntity, user => user.groups)
  @JoinTable({
    joinColumn: { name: 'groupId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'userId', referencedColumnName: 'id' }
  })
  members: UserEntity[];
}
