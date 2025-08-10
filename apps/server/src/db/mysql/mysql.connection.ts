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
  WorkflowTransitionEntity,
  WorkflowEntity,
  TaskStatusEntity,
  TaskCommentEntity,
  TaskStatusHistoryEntity,
  ProjectCancellationEntity,
  TranslationPreviewEntity, DeadlineExtensionEntity,
  AssignmentHistoryEntity,
  TaskAssignmentEntity,
  PageDifficultyEntity,
  DifficultyConfigEntity
} from '#LocalProject/Entities';

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
      ssl: {
        rejectUnauthorized: false,
      },
      synchronize: true,
      logging: true,
      supportBigNumbers: true,
      charset: 'utf8mb4_unicode_ci',
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
        TaskStatusEntity,
        TaskStatusHistoryEntity,
        WorkflowEntity,
        WorkflowTransitionEntity,
        TaskCommentEntity,
        DeadlineExtensionEntity,
        ProjectCancellationEntity,
        TranslationPreviewEntity,
        AssignmentHistoryEntity,
        TaskAssignmentEntity,
        DifficultyConfigEntity,
        PageDifficultyEntity,
      ],
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
