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

      // Ensure review fields exist in requests table
      try {
        const reviewFields = [
          'reviewedAt',
          'reviewDecision',
          'reviewRating',
          'reviewComment'
        ];

        for (const field of reviewFields) {
          const columnExists = await this.dataSource.query(
            `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'requests' AND COLUMN_NAME = '${field}'`
          );

          if (columnExists.length === 0) {
            let alterQuery = '';
            switch (field) {
              case 'reviewedAt':
                alterQuery = 'ALTER TABLE `requests` ADD COLUMN `reviewedAt` DATETIME NULL COMMENT "When the request was reviewed"';
                break;
              case 'reviewDecision':
                alterQuery = 'ALTER TABLE `requests` ADD COLUMN `reviewDecision` ENUM("APPROVED", "REJECTED") NULL COMMENT "Review decision"';
                break;
              case 'reviewRating':
                alterQuery = 'ALTER TABLE `requests` ADD COLUMN `reviewRating` INT NULL COMMENT "Review rating from 1-5 stars"';
                break;
              case 'reviewComment':
                alterQuery = 'ALTER TABLE `requests` ADD COLUMN `reviewComment` TEXT NULL COMMENT "Review comment from requester"';
                break;
            }

            if (alterQuery) {
              await this.dataSource.query(alterQuery);
              this.logger.log(`Added requests.${field} column for review functionality`);
            }
          } else {
            this.logger.log(`requests.${field} column already exists`);
          }
        }
      } catch (e) {
        this.logger.error('Inline migration for requests review fields failed:', e);
        // This is critical for the application to work, so throw the error
        throw e;
      }

      // Ensure status enum includes INCOMPLETED value
      try {
        // Check if INCOMPLETED value exists in status enum
        const statusValues = await this.dataSource.query(
          "SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'requests' AND COLUMN_NAME = 'status'"
        );

        if (statusValues.length > 0) {
          const columnType = statusValues[0].COLUMN_TYPE;
          if (columnType && !columnType.includes('INCOMPLETED')) {
            // Add INCOMPLETED to the enum
            await this.dataSource.query(
              "ALTER TABLE `requests` MODIFY COLUMN `status` ENUM('CANCELLED', 'PENDING', 'APPROVED', 'REJECTED', 'COMPLETED', 'INCOMPLETED', 'DELIVERYPENDING', 'FAILED', 'WAITING_APPROVAL', 'EXTENSION_REQUESTED', 'EXTENSION_APPROVED', 'EXTENSION_REJECTED', 'CANCELLATION_REQUESTED', 'CANCELLATION_PENDING', 'ARCHIVED') NOT NULL DEFAULT 'PENDING'"
            );
            this.logger.log('Added INCOMPLETED value to requests.status enum');
          } else {
            this.logger.log('INCOMPLETED value already exists in requests.status enum');
          }
        }
      } catch (e) {
        this.logger.error('Failed to update requests.status enum:', e);
        // Don't throw error here as this is not critical for basic functionality
      }

      // Ensure rating fields exist in user table
      try {
        const userRatingFields = [
          'rating',
          'reviewCount',
          'lastReviewComment'
        ];

        for (const field of userRatingFields) {
          const columnExists = await this.dataSource.query(
            `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'user' AND COLUMN_NAME = '${field}'`
          );

          if (columnExists.length === 0) {
            let alterQuery = '';
            switch (field) {
              case 'rating':
                alterQuery = 'ALTER TABLE `user` ADD COLUMN `rating` DECIMAL(3,1) NULL COMMENT "Average rating from 1-5 stars"';
                break;
              case 'reviewCount':
                alterQuery = 'ALTER TABLE `user` ADD COLUMN `reviewCount` INT NULL COMMENT "Total number of reviews received"';
                break;
              case 'lastReviewComment':
                alterQuery = 'ALTER TABLE `user` ADD COLUMN `lastReviewComment` TEXT NULL COMMENT "Last review comment received"';
                break;
            }

            if (alterQuery) {
              await this.dataSource.query(alterQuery);
              this.logger.log(`Added user.${field} column for rating functionality`);
            }
          } else {
            this.logger.log(`user.${field} column already exists`);
          }
        }
      } catch (e) {
        this.logger.error('Inline migration for user rating fields failed:', e);
        // This is critical for the application to work, so throw the error
        throw e;
      }

      // Create indexes for better performance (if they don't exist)
      try {
        const indexesToCreate = [
          { table: 'requests', column: 'reviewedAt', name: 'idx_requests_reviewed_at' },
          { table: 'requests', column: 'reviewDecision', name: 'idx_requests_review_decision' },
          { table: 'user', column: 'rating', name: 'idx_user_rating' },
          { table: 'user', column: 'reviewCount', name: 'idx_user_review_count' }
        ];

        for (const index of indexesToCreate) {
          const indexExists = await this.dataSource.query(
            `SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = '${index.table}' AND INDEX_NAME = '${index.name}'`
          );

          if (indexExists.length === 0) {
            await this.dataSource.query(
              `CREATE INDEX ${index.name} ON \`${index.table}\`(\`${index.column}\`)`
            );
            this.logger.log(`Created index ${index.name} on ${index.table}.${index.column}`);
          } else {
            this.logger.log(`Index ${index.name} already exists`);
          }
        }
      } catch (e) {
        this.logger.warn('Failed to create some indexes, continuing without them:', e);
        // Don't throw error here as indexes are not critical for basic functionality
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
