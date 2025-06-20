import {
  ProjectEntity,
  ProjectRoleEntity,
  CategoryEntity,
  ProjectTagEntity,
  RequestEntity,
  ProjectGroupEntity,
  UserTypeEntity,
  UserEntity,
  ProjectDiscussionCommentEntity,
  ProjectDiscussionThreadEntity,
  DiscussionAccessPolicyEntity
} from '#LocalProject/Entities';
import { Global, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CategoryManagerService } from "./service/category-manager.service";
import { RequestManagerService } from "./service/request-manager.service";
import { UserManagerService } from "./service/user-manager.service";
import { ProjectManagerService } from "./service/project-manager.service";
import { ProjectTagManagerService } from "./service/project-tag-manager.service";
import { CategoryController } from "./controller/category.controller";
import { ProjectController } from "./controller/project.controller";
import { ProjectTagController } from "./controller/project-tag.controller";
import { UserController } from "./controller/user.controller";
import { AuthModule } from "#LocalProject/Auth/auth.module";
import { GroupManagerService } from '#LocalProject/Managers/service/group-manager.service';
import { RoleManagerService } from '#LocalProject/Managers/service/role-manager.service';
import { DiscussionManagerService } from '#LocalProject/Managers/service/discussion-manager.service';

@Global()
@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([
      CategoryEntity,
      ProjectTagEntity,
      ProjectEntity,
      ProjectRoleEntity,
      RequestEntity,
      ProjectGroupEntity,
      UserTypeEntity,
      UserEntity,
      ProjectDiscussionThreadEntity,
      ProjectDiscussionCommentEntity,
      DiscussionAccessPolicyEntity,
    ])
  ],
  providers: [
    CategoryManagerService,
    RequestManagerService,
    UserManagerService,
    ProjectManagerService,
    ProjectTagManagerService,
    GroupManagerService,
    RoleManagerService,
    DiscussionManagerService
  ],
  exports: [
    CategoryManagerService,
    RequestManagerService,
    UserManagerService,
    ProjectManagerService,
    ProjectTagManagerService,
    GroupManagerService,
    RoleManagerService,
    DiscussionManagerService,
  ],
  controllers: [
    CategoryController,
    ProjectController,
    ProjectTagController,
    UserController
  ]
})
export class ManagersModule { }
