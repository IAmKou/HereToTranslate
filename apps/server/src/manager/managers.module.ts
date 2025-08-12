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
  UserEntity, UserTypeEntity, WalletEntity, TranslationApprovalEntity,
  BranchEntity, CommitEntity, FileEntity, TaskEntity, NotificationEntity, SettingsEntity,
  TaskStatusEntity,
  AssignmentHistoryEntity,
  DeadlineExtensionEntity,
  DifficultyConfigEntity,
  PageDifficultyEntity,
  ProjectCancellationEntity,
  TaskAssignmentEntity,
  WorkflowEntity,
  WorkflowTransitionEntity,
  TaskStatusHistoryEntity
} from '#LocalProject/Entities';
import { TaskHistoryEntity } from '../db/mysql/entity/task-history.entity';
import { RequestRegistrationEntity } from '#LocalProject/Entities';
import { ProjectActivity } from '../db/mysql/entity/project-activity.entity';

import { ProjectInvitationEntity } from '../db/mysql/entity/project-invitation.entity';
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
import { TranslationController } from './controller/translation.controller';
import { AdminTransactionController } from './controller/admin-transaction.controller';
import { ChatController } from '../chat/chat.controller';
import { TaskManagerService } from '#LocalProject/Managers/service/task-manager.service';
import { TaskController } from './controller/task.controller';
import { TaskGateway } from '#LocalProject/Utils/gateway/task.gateway';
import { ManifestService } from '#LocalProject/Managers/service/manifest.service';
import { NotificationManagerService } from '#LocalProject/Managers/service/notification-manager.service';
import { NotificationController } from '#LocalProject/Managers/controller/notification.controller';
import { BullModule } from '@nestjs/bull';
import { AiChatService } from '#LocalProject/Managers/service/ai-manager.service';
import { AiChatController } from '#LocalProject/Managers/controller/ai-chat.controller';
import { NotificationGateway } from '#LocalProject/Utils/gateway/notification.gateway';
import { AdminNotificationController } from '#LocalProject/Managers/controller/admin-notification.controller';
import { ProjectInvitationController } from './controller/project-invitation.controller';
import { ProjectInvitationService } from './service/project-invitation.service';
import { FeeService } from '#LocalProject/Managers/service/fee-manager.service';
import { ActivityManagerService } from './service/activity-manager.service';
import { ActivityController } from './controller/activity.controller';
import { PageDifficultyService } from './service/page-difficulty.service';
import { ProjectCancellationService } from './service/project-cancellation.service';
import { TaskAssignmentManagerService } from './service/task-assignment-manager.service';
import { WorkflowManagerService } from './service/workflow-manager.service';
import { DeadlineCheckerService } from './service/deadlinechecker.service';
import { StatusManagerService } from './service/task-status-manager.service';
import { DeadlineManagementController } from './controller/deadline-management.controller';
import { PageDifficultyController } from './controller/page-difficulty.controller';
import { ProjectCancellationController } from './controller/project-cancellation.controller';
import { StatusController } from './controller/status.controller';
import { TaskAssignmentController } from './controller/task-assignment.controller';
import { WorkflowController } from './controller/workflow.controller';

@Global()
@Module({
  imports: [
    AuthModule,
    MongoModule,
    TypeOrmModule.forFeature([
      CategoryEntity,
      TaskStatusEntity,
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
      TaskEntity,
      TaskHistoryEntity,
      NotificationEntity,
      ProjectInvitationEntity,
      RequestRegistrationEntity,
      SettingsEntity,
      ProjectActivity,
      AssignmentHistoryEntity,
      DeadlineExtensionEntity,
      DifficultyConfigEntity,
      PageDifficultyEntity,
      ProjectCancellationEntity,
      TaskAssignmentEntity,
      WorkflowEntity,
      WorkflowTransitionEntity,
      TaskStatusHistoryEntity,
    ]),
    BullModule.registerQueue({ name: 'extract', redis: { host: 'localhost', port: 6379 } }),
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
    TaskManagerService,
    ManifestService,
    NotificationManagerService,
    AiChatService,
    TaskGateway,
    NotificationGateway,
    ProjectInvitationService,
    FeeService,
    ActivityManagerService,
    DeadlineCheckerService,
    PageDifficultyService,
    ProjectCancellationService,
    TaskAssignmentManagerService,
    StatusManagerService,
    WorkflowManagerService,
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
    TaskManagerService,
    ManifestService,
    NotificationManagerService,
    AiChatService,
    ProjectInvitationService,
    FeeService,
    ActivityManagerService,
    DeadlineCheckerService,
    PageDifficultyService,
    ProjectCancellationService,
    TaskAssignmentManagerService,
    StatusManagerService,
    WorkflowManagerService,
  ],
  controllers: [
    // CategoryController,
    // ProjectController,
    // RequestController,
    // UserController,
    // ProjectRoleController,
    // DiscussionController,
    // GroupController,
    // ProjectTagController,
    // WalletController,
    // PaymentController,
    // FileController,
    // TranslationController,
    // AdminTransactionController,
    // ChatController,
    // TaskController,
    // NotificationController,
    // AiChatController,
    // AdminNotificationController,
    // ProjectInvitationController,
    // ActivityController,
    // DeadlineManagementController,
    // PageDifficultyController,
    // ProjectCancellationController,
    // StatusController,
    // TaskAssignmentController,
    // WorkflowController,
  ]
})
export class ManagersModule {
}
