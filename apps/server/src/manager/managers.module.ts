import { CategoryEntity } from '../db/mysql/entity/category.entity';
import { DiscussionAccessPolicyEntity, ProjectDiscussionCommentEntity, ProjectDiscussionThreadEntity } from '../db/mysql/entity/project-discussion.entity';
import { ProjectEntity } from '../db/mysql/entity/project.entity';
import { ProjectGroupEntity } from '../db/mysql/entity/project-group.entity';
import { ProjectRoleEntity } from '../db/mysql/entity/project-role.entity';
import { ProjectTagEntity } from '../db/mysql/entity/project-tag.entity';
import { RequestEntity } from '../db/mysql/entity/request.entity';
import { TransactionEntity } from '../db/mysql/entity/transaction.entity';
import { UserEntity } from '../db/mysql/entity/user.entity';
import { UserTypeEntity } from '../db/mysql/entity/user-type.entity';
import { WalletEntity } from '../db/mysql/entity/wallet.entity';
import { TranslationApprovalEntity } from '../db/mysql/entity/translation-approval.entity';
import { BranchEntity } from '../db/mysql/entity/branch.entity';
import { CommitEntity } from '../db/mysql/entity/commit.entity';
import { FileEntity } from '../db/mysql/entity/file.entity';
import { TaskEntity } from '../db/mysql/entity/task.entity';
import { NotificationEntity } from '../db/mysql/entity/notification.entity';
import { SettingsEntity } from '../db/mysql/entity/setting.entity';
import { TaskStatusEntity } from '../db/mysql/entity/task-status.entity';
import { AssignmentHistoryEntity } from '../db/mysql/entity/assignment-history.entity';
import { DeadlineExtensionEntity } from '../db/mysql/entity/deadline-extension.entity';
import { ProjectCancellationEntity } from '../db/mysql/entity/project-cancellation.entity';
import { TaskAssignmentEntity } from '../db/mysql/entity/task-assignment.entity';
import { WorkflowEntity } from '../db/mysql/entity/workflow.entity';
import { WorkflowTransitionEntity } from '../db/mysql/entity/workflow-transition.entity';
import { TaskStatusHistoryEntity } from '../db/mysql/entity/task-status-history.entity';
import { TranslationPreviewEntity } from '../db/mysql/entity/translation-preview.entity';
import { SubtaskEntity } from '../db/mysql/entity/subtask.entity';
import { SubtaskStatusHistoryEntity } from '../db/mysql/entity/subtask-status-history.entity';
import { TaskHistoryEntity } from '../db/mysql/entity/task-history.entity';
import { RequestRegistrationEntity } from '../db/mysql/entity/request-registration.entity';
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
import { SubtaskController } from './controller/subtask.controller';
import { OverdueCheckerService } from './service/overdue-checker.service';
import { ExportManagerService } from '#LocalProject/Managers/service/export-manager.service';
import { ExportController } from '#LocalProject/Managers/controller/export.controller';
import { ExportJobProcessor } from '#LocalProject/Managers/service/export-job.processor';
import { PaypalConfigChecker } from '#LocalProject/Managers/service/paypal-config-checker';
import { AsposePDFBridge } from '../util/extensions/aspose-pdf-bridge';
import { AsposeDocxBridge } from '../util/extensions/aspose-docx-bridge';

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
      TaskStatusHistoryEntity,
      WorkflowEntity,
      WorkflowTransitionEntity,
      TaskAssignmentEntity,
      AssignmentHistoryEntity,
      DeadlineExtensionEntity,
      ProjectCancellationEntity,
      TranslationPreviewEntity,
      SubtaskEntity,
      SubtaskStatusHistoryEntity,
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
    ScannerCronService,
    ProjectCancellationService,
    TaskAssignmentManagerService,
    StatusManagerService,
    WorkflowManagerService,
    SubtaskManagerService,
    OverdueCheckerService,
    TaskManagerService,
    ExportManagerService,
    ExportJobProcessor,
    BackgroundExtractService,
    PaypalConfigChecker,
    AsposePDFBridge,
    AsposeDocxBridge,
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
    ScannerCronService,
    ProjectCancellationService,
    TaskAssignmentManagerService,
    StatusManagerService,
    WorkflowManagerService,
    SubtaskManagerService,
    OverdueCheckerService,
    TaskManagerService,
    TaskAssignmentManagerService,
    ExportManagerService,
    BackgroundExtractService,
    PaypalConfigChecker,
    AsposePDFBridge,
    AsposeDocxBridge,
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
    ExportController,
    WorkflowController,
    StatusController
  ],

})
export class ManagersModule {}
