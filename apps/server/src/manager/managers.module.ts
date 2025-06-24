import {
  CategoryEntity,
  DiscussionAccessPolicyEntity,
  ProjectDiscussionCommentEntity,
  ProjectDiscussionThreadEntity,
  ProjectEntity,
  ProjectGroupEntity,
  ProjectRoleEntity,
  ProjectTagEntity,
  RequestEntity,
  UserEntity,
  UserTypeEntity
} from '#LocalProject/Entities';
import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '#LocalProject/Auth/auth.module';

import { CategoryManagerService } from './service/category-manager.service';
import { RequestManagerService } from './service/request-manager.service';
import { UserManagerService } from './service/user-manager.service';
import { ProjectManagerService } from './service/project-manager.service';
import { CategoryController } from './controller/category.controller';
import { ProjectController } from './controller/project.controller';
import { UserController } from './controller/user.controller';
import { GroupManagerService } from './service/group-manager.service';
import { DiscussionManagerService } from './service/discussion-manager.service';
import { ProjectRoleManagerService } from './service/project-role-manager.service';
import { RequestController } from './controller/request.controller';
import { ProjectRoleController } from '#LocalProject/Managers/controller/projectRoleController';
import { DiscussionController } from '#LocalProject/Managers/controller/discussion.controller';
import { GroupController } from '#LocalProject/Managers/controller/group.controller';

@Global()
@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([
      CategoryEntity,
      DiscussionAccessPolicyEntity,
      ProjectEntity,
      ProjectDiscussionThreadEntity,
      ProjectDiscussionCommentEntity,
      ProjectGroupEntity,
      ProjectRoleEntity,
      ProjectTagEntity,
      RequestEntity,
      UserEntity,
      UserTypeEntity
    ])
  ],
  providers: [
    CategoryManagerService,
    RequestManagerService,
    UserManagerService,
    GroupManagerService,
    ProjectRoleManagerService,
    DiscussionManagerService,
    ProjectManagerService
  ],
  exports: [
    CategoryManagerService,
    RequestManagerService,
    UserManagerService,
    GroupManagerService,
    ProjectRoleManagerService,
    DiscussionManagerService,
    ProjectManagerService
  ],
  controllers: [
    CategoryController,
    ProjectController,
    RequestController,
    UserController,
    ProjectRoleController,
    DiscussionController,
    GroupController
  ]
})
export class ManagersModule {
}
