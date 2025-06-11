import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectController } from './project.controller';
import { ProjectService } from './project.service';
import { ProjectEntity } from '../db/mysql/entity/project.entity';
import { UserEntity } from '../db/mysql/entity/user.entity';
import { ProjectRoleEntity } from '../db/mysql/entity/projectRole.entity';
import { Category } from '../db/mysql/entity/category.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProjectEntity, UserEntity, ProjectRoleEntity, Category])
  ],
  controllers: [ProjectController],
  providers: [ProjectService],
  exports: [ProjectService]
})
export class ProjectModule {}
