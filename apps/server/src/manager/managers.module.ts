import { ProjectEntity, UserEntity, ProjectRoleEntity, CategoryEntity, ProjectTagEntity, RequestEntity, ProjectGroupEntity, ProjectDiscussionThreadEntity, DiscussionAccessPolicyEntity, ProjectDiscussionCommentEntity } from "#LocalProject/Entities";
import { Global, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CategoryManagerService } from "./service/category-manager.service";
import { RequestManagerService } from "./service/request-manager.service";
import { UserManagerService } from "./service/user-manager.service";
import { ProjectManagerService } from "./service/project-manager.service";
import { CategoryController } from "./controller/category.controller";
import { ProjectController } from "./controller/project.controller";
import { UserController } from "./controller/user.controller";
import { AuthModule } from "#LocalProject/Auth/auth.module";
import { GroupManagerService } from "./service/group-manager.service";
import { DiscussionManagerService } from "./service/discussion-manager.service";
import { RoleManagerService } from "./service/role-manager.service";
import { RequestController } from "./controller/request.controller";

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
      UserEntity
    ])
  ],
  providers: [
    CategoryManagerService,
    RequestManagerService,
    UserManagerService,
    GroupManagerService,
    RoleManagerService,
    DiscussionManagerService,
    ProjectManagerService
  ],
  exports: [
    CategoryManagerService,
    RequestManagerService,
    UserManagerService,
    GroupManagerService,
    RoleManagerService,
    DiscussionManagerService,
    ProjectManagerService
  ],
  controllers: [
    CategoryController,
    ProjectController,
    RequestController,
    UserController
  ]
})
export class ManagersModule { }
