import { ProjectEntity, UserEntity, ProjectRoleEntity, CategoryEntity, ProjectTagEntity, RequestEntity, ProjectGroupEntity } from "#LocalProject/Entities";
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

@Global()
@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([
      CategoryEntity,
      ProjectTagEntity,
      UserEntity,
      ProjectEntity,
      ProjectRoleEntity,
      RequestEntity,
      ProjectGroupEntity,
      UserTypeEntity
    ])
  ],
  providers: [
    CategoryManagerService,
    RequestManagerService,
    UserManagerService,
    ProjectManagerService,
    ProjectTagManagerService
  ],
  exports: [
    CategoryManagerService,
    RequestManagerService,
    UserManagerService,
    ProjectManagerService,
    ProjectTagManagerService
  ],
  controllers: [
    CategoryController,
    ProjectController,
    ProjectTagController,
    UserController
  ]
})
export class ManagersModule { }
