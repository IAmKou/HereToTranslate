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
  ProjectTagEntity, TranslationApprovalEntity, WalletEntity,
  NotificationEntity, SettingsEntity,
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
import { TaskHistoryEntity } from './entity/task-history.entity';
import { ProjectActivity } from './entity/project-activity.entity';


@Injectable()
export class MySqlConnection {
  private static instance: MySqlConnection;

  // TypeORM DataSource instance
  private readonly _dataSource: DataSource;

  private readonly logger = new Logger(MySqlConnection.name);

  constructor(private readonly config: ConfigService) {
    this._dataSource = new DataSource({
      type: 'mysql',
      host: this.config.get<string>('MYSQL_HOST'),
      port: this.config.get<number>('MYSQL_PORT'),
      username: this.config.get<string>('MYSQL_USER'),
      password: this.config.get<string>('MYSQL_PASSWORD'),
      database: this.config.get<string>('MYSQL_DATABASE'),
      ssl : {
        rejectUnauthorized: false,
      },
      synchronize: process.env.NODE_ENV === 'development',
      logging: true,
      supportBigNumbers: true,
      charset: 'utf8mb4_unicode_ci',
      migrations: process.env.NODE_ENV === 'production' ? ['dist/migrations/*.js'] : [],
      migrationsRun: process.env.NODE_ENV === 'production',
      entities: [UserEntity, BranchEntity, ProjectEntity, CategoryEntity, FileEntity,
        ProjectGroupEntity, ProjectRoleEntity, ProjectInvitationEntity, ReportEntity, RequestEntity, TaskEntity,
        TransactionEntity, CommitEntity, ProjectTagEntity, ProjectDiscussionCommentEntity,
        ProjectDiscussionThreadEntity, DiscussionAccessPolicyEntity, UserTypeEntity, TranslationApprovalEntity, WalletEntity, NotificationEntity, SettingsEntity, TaskHistoryEntity, ProjectActivity,
        TaskStatusEntity, AssignmentHistoryEntity, DeadlineExtensionEntity, DifficultyConfigEntity, PageDifficultyEntity, ProjectCancellationEntity, TaskAssignmentEntity, WorkflowEntity, WorkflowTransitionEntity, TaskStatusHistoryEntity],
    });
    MySqlConnection.instance = this;
  }

  // Init MySQL connection
  async init() {
    try {
      await this.dataSource.initialize();
      this.logger.log('Connected to MySQL database');
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
