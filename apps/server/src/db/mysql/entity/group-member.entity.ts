import { Entity, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn, Unique } from 'typeorm';
import { UserEntity } from './user.entity';
import { ProjectGroupEntity } from './project-group.entity';

@Entity('groupMember')
@Unique(['group', 'user'])
export class GroupMemberEntity {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id: bigint;

  @ManyToOne(() => ProjectGroupEntity, group => group.members)
  group: ProjectGroupEntity;

  @ManyToOne(() => UserEntity, user => user.groupMemberships)
  user: UserEntity;

  @CreateDateColumn()
  addedAt: Date;
}
