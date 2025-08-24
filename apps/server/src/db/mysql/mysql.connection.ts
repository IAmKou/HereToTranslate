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
      synchronize: false, // Temporarily disabled to prevent schema conflicts
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

      // Ensure `project.isSyncedFromRequest` exists and is backfilled
      try {
        // Check if column exists first
        const columns = await this.dataSource.query(
          "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'project' AND COLUMN_NAME = 'isSyncedFromRequest'"
        );

        if (columns.length === 0) {
          // Column doesn't exist, add it
          await this.dataSource.query(
            'ALTER TABLE `project` ADD COLUMN `isSyncedFromRequest` TINYINT(1) NOT NULL DEFAULT 0'
          );
          this.logger.log('Added project.isSyncedFromRequest column');
        } else {
          this.logger.log('project.isSyncedFromRequest column already exists');
        }

        // Backfill: projects created from requests should have isSyncedFromRequest = 1
        // This is a placeholder - you may need to adjust the logic based on your business rules
        // For example, if you have a requestId field in project table:
        // await this.dataSource.query('UPDATE `project` SET `isSyncedFromRequest` = 1 WHERE `requestId` IS NOT NULL');
      } catch (e) {
        this.logger.error('Inline migration for project.isSyncedFromRequest failed:', e);
        throw e; // Re-throw to prevent connection from proceeding without the column
      }

      // Ensure `requests.rating` exists for star rating functionality
      try {
        const ratingColumns = await this.dataSource.query(
          "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'requests' AND COLUMN_NAME = 'rating'"
        );

        if (ratingColumns.length === 0) {
          // Column doesn't exist, add it
          await this.dataSource.query(
            'ALTER TABLE `requests` ADD COLUMN `rating` INT NULL COMMENT "Rating from 1-5 stars given by requester to translator"'
          );
          this.logger.log('Added requests.rating column for star rating functionality');
        } else {
          this.logger.log('requests.rating column already exists');
        }
      } catch (e) {
        this.logger.error('Inline migration for requests.rating failed:', e);
        // This is critical for the application to work, so throw the error
        throw e;
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
