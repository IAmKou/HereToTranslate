import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn, CreateDateColumn } from 'typeorm';
import { ProjectGroupEntity } from './projectGroup.entity';
import { UserEntity } from './user.entity';

@Entity('groupMember')
export class GroupMemberEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  groupId: number;

  @Column()
  userId: number;

  @CreateDateColumn({ name: 'addedAt' })
  addedAt: Date;

  @ManyToOne(() => ProjectGroupEntity, group => group.members)
  @JoinColumn({ name: 'groupId' })
  group: ProjectGroupEntity;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'userId' })
  user: UserEntity;
}
