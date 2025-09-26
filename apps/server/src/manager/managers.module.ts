import { CategoryEntity,
  DiscussionAccessPolicyEntity,
  ProjectEntity,
  ProjectDiscussionCommentEntity,
  ProjectDiscussionThreadEntity,
  ProjectGroupEntity,
  ProjectRoleEntity,
  ProjectTagEntity,
  RequestEntity,
  TransactionEntity,
  UserEntity,
  UserTypeEntity,
  WalletEntity,
  TranslationApprovalEntity,
  FileEntity,
  TaskEntity,
  NotificationEntity,
  SettingsEntity,
  TaskStatusEntity,
  AssignmentHistoryEntity,
  DeadlineExtensionEntity,
  ProjectCancellationEntity,
  TaskAssignmentEntity,
  WorkflowEntity,
  WorkflowTransitionEntity,
  TaskStatusHistoryEntity,
  SubtaskStatusHistoryEntity,
  TaskCommentEntity,
  ProjectActivity,
  ProjectInvitationEntity,
  SubtaskEntity,
  TranslationPreviewEntity,
  TaskHistoryEntity,
  RequestReviewEntity,
  AdminReviewEntity
} from '#LocalProject/Entities';
import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
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
import { BackgroundExtractService } from './service/background-extract.service';
import { AiChatService } from '#LocalProject/Managers/service/ai-manager.service';
import { AiChatController } from '#LocalProject/Managers/controller/ai-chat.controller';
import { NotificationGateway } from '#LocalProject/Utils/gateway/notification.gateway';
import { AdminNotificationController } from '#LocalProject/Managers/controller/admin-notification.controller';
import { ProjectInvitationController } from './controller/project-invitation.controller';
import { ProjectInvitationService } from './service/project-invitation.service';
import { FeeService } from '#LocalProject/Managers/service/fee-manager.service';
import { ActivityManagerService } from './service/activity-manager.service';
import { ActivityController } from './controller/activity.controller';
import { ProjectCancellationService } from './service/project-cancellation.service';
import { TaskAssignmentManagerService } from './service/task-assignment-manager.service';
import { WorkflowManagerService } from './service/workflow-manager.service';
import { DeadlineCheckerService } from './service/deadlinechecker.service';
import { StatusManagerService } from './service/task-status-manager.service';
import { ScannerCronService } from './service/scanner-cron.service';
import { DeadlineManagementController } from './controller/deadline-management.controller';
import { ProjectCancellationController } from './controller/project-cancellation.controller';
import { StatusController } from './controller/status.controller';
import { TaskAssignmentController } from './controller/task-assignment.controller';
import { WorkflowController } from './controller/workflow.controller';
import { ScannerCronController } from './controller/scanner-cron.controller';
import { DeadlineCheckerController } from './controller/deadline-checker.controller';
import { SubtaskManagerService } from './service/subtask-manager.service';
import { AsposeService } from './service/aspose.service';
import { SubtaskController } from './controller/subtask.controller';
import { TaskCommentManagerService } from './service/task-comment-manager.service';
import { TaskCommentController } from './controller/task-comment.controller';
import { OverdueCheckerService } from './service/overdue-checker.service';
import { ExportManagerService } from '#LocalProject/Managers/service/export-manager.service';
import { ExportController } from '#LocalProject/Managers/controller/export.controller';
import { ExportJobProcessor } from '#LocalProject/Managers/service/export-job.processor';
import { PaypalConfigChecker } from '#LocalProject/Managers/service/paypal-config-checker';
import { FeeController } from './controller/fee.controller';
import { TranslationEntity } from '../db/mysql/entity/translation.entity';
import { DocxEditorService } from './service/docx-editor.service';
import { AdminReviewService } from './service/admin-review.service';
import { AdminReviewController } from './controller/admin-review.controller';

@Global()
@Module({
  imports: [
    ConfigModule,
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
      FileEntity,
      TaskEntity,
      TaskHistoryEntity,
      NotificationEntity,
      ProjectInvitationEntity,
      SettingsEntity,
      ProjectActivity,
      TaskStatusHistoryEntity,
      WorkflowEntity,
      WorkflowTransitionEntity,
      TaskAssignmentEntity,
      AssignmentHistoryEntity,
      DeadlineExtensionEntity,
      ProjectCancellationEntity,
      TranslationPreviewEntity,
      RequestReviewEntity,
      SubtaskEntity,
      SubtaskStatusHistoryEntity,
      TaskCommentEntity,
      TranslationEntity,
      AdminReviewEntity
    ]),
    // Restore Bull queue for export jobs (required by ExportManagerService)
    BullModule.registerQueue({ name: 'export', redis: { host: 'localhost', port: 6379 } }),
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
    ScannerCronService,
    ProjectCancellationService,
    TaskAssignmentManagerService,
    StatusManagerService,
    WorkflowManagerService,
    SubtaskManagerService,
    TaskCommentManagerService,
    OverdueCheckerService,
    TaskManagerService,
    ExportManagerService,
    ExportJobProcessor,
    BackgroundExtractService,
    PaypalConfigChecker,
    AsposeService,
    DocxEditorService,
    AdminReviewService,
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
    ScannerCronService,
    ProjectCancellationService,
    TaskAssignmentManagerService,
    StatusManagerService,
    WorkflowManagerService,
    SubtaskManagerService,
    TaskCommentManagerService,
    OverdueCheckerService,
    TaskManagerService,
    TaskAssignmentManagerService,
    ExportManagerService,
    BackgroundExtractService,
    PaypalConfigChecker,
    AsposeService,
    DocxEditorService,
    AdminReviewService,

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
    TranslationController,
    AdminTransactionController,
    ChatController,
    TaskController,
    NotificationController,
    AiChatController,
    AdminNotificationController,
    ProjectInvitationController,
    ActivityController,
    DeadlineManagementController,
    ProjectCancellationController,
    StatusController,
    TaskAssignmentController,
    WorkflowController,
    ScannerCronController,
    DeadlineCheckerController,
    SubtaskController,
    TaskCommentController,
    ExportController,
    WorkflowController,
    StatusController,
    FeeController,
    AdminReviewController
  ],

})
export class ManagersModule {}
