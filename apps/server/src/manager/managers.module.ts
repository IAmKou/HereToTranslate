import {
  CategoryEntity,
  DiscussionAccessPolicyEntity,
  ProjectDiscussionCommentEntity,
  ProjectDiscussionThreadEntity,
  ProjectEntity,
  ProjectGroupEntity,
  ProjectRoleEntity,
  ProjectTagEntity,
  RequestEntity, TransactionEntity,
  UserEntity, UserTypeEntity, WalletEntity,TranslationApprovalEntity,
  BranchEntity,CommitEntity,FileEntity
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
import { ProjectRoleController } from './controller/project-role.controller';
import { DiscussionController } from '#LocalProject/Managers/controller/discussion.controller';
import { GroupController } from '#LocalProject/Managers/controller/group.controller';
import { ProjectTagManagerService } from '#LocalProject/Managers/service/project-tag-manager.service';
import { ProjectTagController } from '#LocalProject/Managers/controller/project-tag.controller';
import { AuthEntity } from '#LocalProject/SqliteEntities';
import { MailService } from '../mailer/mailer.service';
import { ChatService } from '../chat/chat.service';
import { PaypalService } from '#LocalProject/Managers/service/payment-manager.service';
import { MongoModule } from '../db/mongo/mongo.module';
import { WalletController } from './controller/wallet.controller';
import { PaymentController } from './controller/payment.controller';
import { WalletManagerService } from './service/wallet-manager.service';
import { GitHubService } from '#LocalProject/Managers/service/github-manager.service';
import { FileService } from './service/file-manager.service';
import { TranslationService } from './service/translation-manager.service';
import { FileController } from './controller/file.controller';
import { PermissionsController } from './controller/project-role.controller';
import { TranslationController } from './controller/translation.controller';
import { AdminTransactionController } from './controller/admin-transaction.controller';
import { ChatController } from '../chat/chat.controller'; // hoặc đúng path của bạn


@Global()
@Module({
  imports: [
    AuthModule,
    MongoModule,
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
      UserTypeEntity,
      AuthEntity,
      TransactionEntity,
      WalletEntity,
      TranslationApprovalEntity,
      BranchEntity,
      CommitEntity,
      FileEntity,
    ])
  ],
  providers: [
    CategoryManagerService,
    RequestManagerService,
    UserManagerService,
    GroupManagerService,
    ProjectRoleManagerService,
    DiscussionManagerService,
    ProjectManagerService,
    ProjectTagManagerService,
    MailService,
    ChatService,
    PaypalService,
    WalletManagerService,
    GitHubService,
    FileService,
    TranslationService,
  ],
  exports: [
    CategoryManagerService,
    RequestManagerService,
    UserManagerService,
    GroupManagerService,
    ProjectRoleManagerService,
    DiscussionManagerService,
    ProjectManagerService,
    ProjectTagManagerService,
    MailService,
    ChatService,
    PaypalService,
    WalletManagerService,
    GitHubService,
    FileService,
    TranslationService,
  ],
  controllers: [
    CategoryController,
    ProjectController,
    RequestController,
    UserController,
    ProjectRoleController,
    DiscussionController,
    GroupController,
    ProjectTagController,
    WalletController,
    PaymentController,
    FileController,
    PermissionsController,
    TranslationController, // Đăng ký controller translation
    AdminTransactionController,
    ChatController
  ]
})
export class ManagersModule {
}
