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

      // Ensure `project.isSyncedFromRequest` exists (works on MySQL 5.7/8.0)
      try {
        // Try fast-path on newer MySQL
        try {
          await this.dataSource.query(
            'ALTER TABLE `project` ADD COLUMN IF NOT EXISTS `isSyncedFromRequest` TINYINT(1) NOT NULL DEFAULT 0'
          );
          this.logger.log('Ensured project.isSyncedFromRequest column exists (IF NOT EXISTS)');
        } catch (innerErr) {
          // Fallback for MySQL versions that do not support IF NOT EXISTS
          const columns = await this.dataSource.query(
            "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'project' AND COLUMN_NAME = 'isSyncedFromRequest'"
          );
          if (columns.length === 0) {
            await this.dataSource.query(
              'ALTER TABLE `project` ADD COLUMN `isSyncedFromRequest` TINYINT(1) NOT NULL DEFAULT 0'
            );
            this.logger.log('Added project.isSyncedFromRequest column (fallback path)');
          } else {
            this.logger.log('project.isSyncedFromRequest column already exists (fallback path)');
          }
        }
      } catch (e) {
        this.logger.warn('Inline migration for project.isSyncedFromRequest skipped or failed', e as any);
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
          'reviewComment',
          'rejectionReason'
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
              case 'rejectionReason':
                alterQuery = 'ALTER TABLE `requests` ADD COLUMN `rejectionReason` TEXT NULL COMMENT "Reason for rejection when translation is 100% completed"';
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

      // Ensure admin review fields exist in requests table
      try {
        const adminReviewFields = [
          'adminReviewedAt',
          'adminReviewedBy',
          'adminReviewDecision',
          'adminReviewReason',
          'adminReviewNotes'
        ];

        for (const field of adminReviewFields) {
          const columnExists = await this.dataSource.query(
            `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'requests' AND COLUMN_NAME = '${field}'`
          );

          if (columnExists.length === 0) {
            let alterQuery = '';
            switch (field) {
              case 'adminReviewedAt':
                alterQuery = 'ALTER TABLE `requests` ADD COLUMN `adminReviewedAt` DATETIME NULL COMMENT "When admin reviewed the request"';
                break;
              case 'adminReviewedBy':
                alterQuery = 'ALTER TABLE `requests` ADD COLUMN `adminReviewedBy` BIGINT UNSIGNED NULL COMMENT "Admin user ID who reviewed"';
                break;
              case 'adminReviewDecision':
                alterQuery = 'ALTER TABLE `requests` ADD COLUMN `adminReviewDecision` ENUM("APPROVE_TRANSLATOR", "APPROVE_REQUESTER") NULL COMMENT "Admin decision"';
                break;
              case 'adminReviewReason':
                alterQuery = 'ALTER TABLE `requests` ADD COLUMN `adminReviewReason` TEXT NULL COMMENT "Admin reason for decision"';
                break;
              case 'adminReviewNotes':
                alterQuery = 'ALTER TABLE `requests` ADD COLUMN `adminReviewNotes` TEXT NULL COMMENT "Admin notes for internal use"';
                break;
            }

            if (alterQuery) {
              await this.dataSource.query(alterQuery);
              this.logger.log(`Added requests.${field} column for admin review functionality`);
            }
          } else {
            this.logger.log(`requests.${field} column already exists`);
          }
        }
      } catch (e) {
        this.logger.error('Inline migration for requests admin review fields failed:', e);
        // This is critical for the application to work, so throw the error
        throw e;
      }

      // Force update status enum to include DISPUTE and INCOMPLETED
      try {
        // 1. Clean invalid status values first to avoid data conflict
        this.logger.log('🧹 Cleaning invalid status values before enum update...');
        await this.dataSource.query(
          "UPDATE `requests` SET status = 'PENDING' WHERE status NOT IN ('CANCELLED', 'PENDING', 'APPROVED', 'REJECTED', 'COMPLETED', 'INCOMPLETED', 'DELIVERYPENDING', 'FAILED', 'WAITING_APPROVAL', 'DISPUTE', 'EXTENSION_REQUESTED', 'EXTENSION_APPROVED', 'EXTENSION_REJECTED', 'CANCELLATION_REQUESTED', 'CANCELLATION_PENDING', 'ARCHIVED')"
        );
        this.logger.log('✅ Invalid status values cleaned');

        // 2. Then update enum safely
        this.logger.log('🔄 Updating status enum...');
        await this.dataSource.query(
          "ALTER TABLE `requests` MODIFY COLUMN `status` ENUM('CANCELLED', 'PENDING', 'APPROVED', 'REJECTED', 'COMPLETED', 'INCOMPLETED', 'DELIVERYPENDING', 'FAILED', 'WAITING_APPROVAL', 'DISPUTE', 'EXTENSION_REQUESTED', 'EXTENSION_APPROVED', 'EXTENSION_REJECTED', 'CANCELLATION_REQUESTED', 'CANCELLATION_PENDING', 'ARCHIVED') NOT NULL DEFAULT 'PENDING'"
        );
        this.logger.log('✅ Successfully updated requests.status enum to include DISPUTE and INCOMPLETED');
      } catch (e: any) {
        this.logger.error('❌ Failed to update requests.status enum:', e);
        // Force throw error để server không start nếu migration fail
        throw new Error(`Critical migration failed: Cannot update requests.status enum. Error: ${e?.message || 'Unknown error'}`);
      }

      // Ensure TransactionType enum includes ADMIN_REVIEW value
      try {
        const transactionTypeValues = await this.dataSource.query(
          "SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'transactions' AND COLUMN_NAME = 'type'"
        );

        if (transactionTypeValues.length > 0) {
          const columnType = transactionTypeValues[0].COLUMN_TYPE;
          if (columnType && !columnType.includes('ADMIN_REVIEW')) {
            // Add ADMIN_REVIEW to the enum
            await this.dataSource.query(
              "ALTER TABLE `transactions` MODIFY COLUMN `type` ENUM('DEPOSIT', 'PAYMENT', 'WITHDRAWAL', 'REFUND', 'ADMIN_REVIEW') NOT NULL DEFAULT 'PAYMENT'"
            );
            this.logger.log('Added ADMIN_REVIEW value to transactions.type enum');
          } else {
            this.logger.log('ADMIN_REVIEW value already exists in transactions.type enum');
          }
        }
      } catch (e) {
        this.logger.error('Failed to update transactions.type enum:', e);
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

      // Ensure admin review fields exist in transactions table
      try {
        const transactionAdminFields = [
          'fromUserId',
          'toUserId',
          'requestId',
          'adminId',
          'adminNotes'
        ];

        for (const field of transactionAdminFields) {
          const columnExists = await this.dataSource.query(
            `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'transactions' AND COLUMN_NAME = '${field}'`
          );

          if (columnExists.length === 0) {
            let alterQuery = '';
            switch (field) {
              case 'fromUserId':
                alterQuery = 'ALTER TABLE `transactions` ADD COLUMN `fromUserId` BIGINT UNSIGNED NULL COMMENT "User ID who sent the money"';
                break;
              case 'toUserId':
                alterQuery = 'ALTER TABLE `transactions` ADD COLUMN `toUserId` BIGINT UNSIGNED NULL COMMENT "User ID who received the money"';
                break;
              case 'requestId':
                alterQuery = 'ALTER TABLE `transactions` ADD COLUMN `requestId` BIGINT UNSIGNED NULL COMMENT "Related request ID"';
                break;
              case 'adminId':
                alterQuery = 'ALTER TABLE `transactions` ADD COLUMN `adminId` BIGINT UNSIGNED NULL COMMENT "Admin user ID who processed the transaction"';
                break;
              case 'adminNotes':
                alterQuery = 'ALTER TABLE `transactions` ADD COLUMN `adminNotes` TEXT NULL COMMENT "Admin notes for the transaction"';
                break;
            }

            if (alterQuery) {
              await this.dataSource.query(alterQuery);
              this.logger.log(`Added transactions.${field} column for admin review functionality`);
            }
          } else {
            this.logger.log(`transactions.${field} column already exists`);
          }
        }
      } catch (e) {
        this.logger.error('Inline migration for transactions admin review fields failed:', e);
        // This is critical for the application to work, so throw the error
        throw e;
      }

      // Create indexes for better performance (if they don't exist)
      try {
        const indexesToCreate = [
          { table: 'requests', column: 'reviewedAt', name: 'idx_requests_reviewed_at' },
          { table: 'requests', column: 'reviewDecision', name: 'idx_requests_review_decision' },
          { table: 'requests', column: 'status', name: 'idx_requests_status' },
          { table: 'requests', column: 'adminReviewedAt', name: 'idx_requests_admin_reviewed_at' },
          { table: 'user', column: 'rating', name: 'idx_user_rating' },
          { table: 'user', column: 'reviewCount', name: 'idx_user_review_count' },
          { table: 'transactions', column: 'type', name: 'idx_transactions_type' },
          { table: 'transactions', column: 'requestId', name: 'idx_transactions_request_id' }
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
