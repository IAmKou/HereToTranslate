import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany } from 'typeorm';
import { ProjectEntity } from './project.entity';
import { GroupMemberEntity } from './group-member.entity';
import { Permission } from '@here-to-translate/common';

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

  @Column({
    type: 'bigint',
    default: 0n,
    transformer: {
      from(value: bigint | Permission) {
        if (value instanceof Permission) {
          return value;
        }
        return new Permission(value);
      },
      to(permission: Permission) { return permission.value; }
    }
  })
  permissionFlag: Permission;
}
