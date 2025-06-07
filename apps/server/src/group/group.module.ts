import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GroupController } from './group.controller';
import { GroupService } from './group.service';
import { ProjectGroupEntity } from '../db/mysql/entity/projectGroup.entity';
import { GroupMemberEntity } from '../db/mysql/entity/groupMember.entity';
import { UserEntity } from '../db/mysql/entity/user.entity';
import { ProjectEntity } from '../db/mysql/entity/project.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProjectGroupEntity,
      GroupMemberEntity,
      UserEntity,
      ProjectEntity
    ]),
  ],
  controllers: [GroupController],
  providers: [GroupService],
  exports: [GroupService],
})
export class GroupModule {}