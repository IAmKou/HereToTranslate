import { ProjectEntity, UserEntity, ProjectRoleEntity, CategoryEntity, ProjectTagEntity, RequestEntity } from "#LocalProject/Entities";
import { Global, Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CategoryManagerService } from "./service/category-manager.service";
import { RequestManagerService } from "./service/request-manager.service";
import { UserManagerService } from "./service/user-manager.service";
import { ProjectManagerService } from "./service/project-manager.service";
import { CategoryController } from "./controller/category.controller";
import { ProjectController } from "./controller/project.controller";
import { SubCategoryController } from "./controller/subCategory.controller";

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([
      CategoryEntity,
      ProjectTagEntity,
      UserEntity,
      ProjectEntity,
      ProjectRoleEntity,
      RequestEntity
    ])
  ],
  providers: [
    CategoryManagerService,
    RequestManagerService,
    UserManagerService,
    ProjectManagerService
  ],
  exports: [
    CategoryManagerService,
    RequestManagerService,
    UserManagerService,
    ProjectManagerService
  ],
  controllers: [
    CategoryController,
    ProjectController,
    SubCategoryController
  ]
})
export class ManagersModule { }
