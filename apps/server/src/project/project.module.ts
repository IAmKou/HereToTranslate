import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProjectController } from './project.controller';
import { ProjectService } from './project.service';
import { ProjectEntity, UserEntity, ProjectRoleEntity } from '#LocalProject/Entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([ProjectEntity, UserEntity, ProjectRoleEntity])
  ],
  controllers: [ProjectController],
  providers: [ProjectService],
  exports: [ProjectService]
})
export class ProjectModule {}
