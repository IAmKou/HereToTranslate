import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import {
  UserTypeEntity,
  UserEntity,
  BranchEntity,
  ProjectEntity,
  CategoryEntity,
  FileEntity,
  ProjectGroupEntity,
  ProjectRoleEntity,
  ProjectInvitationEntity,
  ProjectDiscussionCommentEntity,
  ProjectDiscussionThreadEntity,
  DiscussionAccessPolicyEntity,
  ReportEntity,
  RequestEntity,
  TaskEntity,
  TransactionEntity,
  CommitEntity,
  ProjectTagEntity,
  TranslationApprovalEntity,
  WalletEntity,
  NotificationEntity,
  SettingsEntity,
  TaskStatusEntity,
  WorkflowEntity,
  WorkflowTransitionEntity,
  AssignmentHistoryEntity,
  TaskAssignmentEntity,
  RequestRegistrationEntity,
  TaskStatusHistoryEntity, SubtaskAssignmentHistoryEntity,
  SubtaskEntity, SubtaskAssignmentEntity, SubtaskStatusHistoryEntity, ProjectCancellationEntity, DeadlineExtensionEntity


} from '#LocalProject/Entities';
import { TaskHistoryEntity } from './entity/task-history.entity';
import { ProjectActivity } from './entity/project-activity.entity';
import { TaskCommentEntity } from './entity/task-comment.entity';

@Injectable()
export class MySqlConnection {
  private static instance: MySqlConnection;

  // TypeORM DataSource instance
  private readonly _dataSource: DataSource;

  private readonly logger = new Logger(MySqlConnection.name);

  constructor(private readonly config: ConfigService) {
    const isDev = this.config.get('NODE_ENV') === 'development';
    this._dataSource = new DataSource({
      type: 'mysql',
      host: this.config.get<string>('MYSQL_HOST'),
      port: this.config.get<number>('MYSQL_PORT'),
      username: this.config.get<string>('MYSQL_USER'),
      password: this.config.get<string>('MYSQL_PASSWORD'),
      database: this.config.get<string>('MYSQL_DATABASE'),
      ssl: {
        rejectUnauthorized: false,
      },
      synchronize: isDev,
      logging: true,
      supportBigNumbers: true,
      charset: 'utf8mb4_unicode_ci',

      migrations:
        isDev ? ['dist/migrations/*.js'] : [],
      migrationsRun: this.config.get<boolean>('MYSQL_MIGRATE_ON_STARTUP') || false,
      entities: [
        UserEntity,
        BranchEntity,
        ProjectEntity,
        CategoryEntity,
        FileEntity,
        ProjectGroupEntity,
        ProjectRoleEntity,
        ProjectInvitationEntity,
        ReportEntity,
        RequestEntity,
        TaskEntity,
        TransactionEntity,
        CommitEntity,
        ProjectTagEntity,
        ProjectDiscussionCommentEntity,
        ProjectDiscussionThreadEntity,
        DiscussionAccessPolicyEntity,
        UserTypeEntity,
        TranslationApprovalEntity,
        WalletEntity,
        NotificationEntity,
        SettingsEntity,
        TaskHistoryEntity,
        ProjectActivity,
        TaskStatusEntity,
        DeadlineExtensionEntity,
        ProjectCancellationEntity,
        TaskAssignmentEntity,
        WorkflowEntity,
        WorkflowTransitionEntity,
        TaskStatusHistoryEntity,
        SubtaskEntity,
        SubtaskAssignmentEntity,
        SubtaskStatusHistoryEntity,
        SubtaskAssignmentHistoryEntity,
        WorkflowEntity,
        WorkflowTransitionEntity,
        TaskStatusHistoryEntity,
        AssignmentHistoryEntity,
        TaskAssignmentEntity,
        RequestRegistrationEntity,
        TaskCommentEntity
      ],
    });
    MySqlConnection.instance = this;
  }

  // Init MySQL connection
  async init() {
    try {
      await this.dataSource.initialize();
      this.logger.log('Connected to MySQL database');

      // Inline-safe migration for shared DBs without direct access
      // Ensure `file.isSyncedFromRequest` exists and is backfilled
      try {
        await this.dataSource.query(
          'ALTER TABLE `file` ADD COLUMN IF NOT EXISTS `isSyncedFromRequest` TINYINT(1) NOT NULL DEFAULT 0'
        );
        await this.dataSource.query(
          'UPDATE `file` SET `isSyncedFromRequest` = 1 WHERE `requestId` IS NOT NULL'
        );
        this.logger.log('Ensured file.isSyncedFromRequest column and backfill completed');
      } catch (e) {
        this.logger.warn('Inline migration for isSyncedFromRequest skipped or failed', e as any);
      }
    } catch (error) {
      this.logger.error('Error connecting to MySQL database', error);
    }
  }

  // Get the MySQL DataSource instance
  get dataSource(): DataSource {
    return this._dataSource;
  }

  // Close the MySQL connection
  async close() {
    await this.dataSource.destroy();
    this.logger.log('MySQL connection closed');
  }

  // Reconnect to MySQL
  async reconnect() {
    await this.close();
    await this.init();
    this.logger.log('MySQL reconnected');
  }
}
