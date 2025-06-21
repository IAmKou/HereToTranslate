import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import {
  UserTypeEntity,
  UserEntity,
  BranchEntity,
  PostEntity,
  ProjectEntity,
  CategoryEntity,
  CommentEntity,
  FileEntity,
  ProjectGroupEntity,
  ProjectRoleEntity,
  ProjectDiscussionCommentEntity,
  ProjectDiscussionThreadEntity,
  DiscussionAccessPolicyEntity,
  RatingEntity,
  ReportEntity,
  RequestEntity,
  TaskEntity,
  TransactionEntity,
  CommitEntity,
  ProjectTagEntity, ProjectDiscussionThreadEntity, ProjectDiscussionCommentEntity, DiscussionAccessPolicyEntity
} from '#LocalProject/Entities';


@Injectable()
export class MySqlConnection {
  private static instance: MySqlConnection;

  // TypeORM DataSource instance
  private readonly dataSource: DataSource;

  private readonly logger = new Logger(MySqlConnection.name);

  constructor(private readonly config: ConfigService) {
    if (MySqlConnection.instance) return MySqlConnection.instance;
    this.dataSource = new DataSource({
      type: 'mysql',
      host: this.config.get<string>('MYSQL_HOST'),
      port: this.config.get<number>('MYSQL_PORT'),
      username: this.config.get<string>('MYSQL_USER'),
      password: this.config.get<string>('MYSQL_PASSWORD'),
      database: this.config.get<string>('MYSQL_DATABASE'),
      // synchronize: true, // Auto create tables (turn off in production)
      logging: true,
      supportBigNumbers: true,
      entities: [RoleEntity, UserEntity, BranchEntity, PostEntity, ProjectEntity, CategoryEntity, CommentEntity, FileEntity,
        ProjectGroupEntity, ProjectRoleEntity, RatingEntity, ReportEntity, RequestEntity, TaskEntity,
        TransactionEntity, CommitEntity, ProjectTagEntity,
        ProjectDiscussionCommentEntity, ProjectDiscussionThreadEntity, DiscussionAccessPolicyEntity],
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
  getDataSource(): DataSource {
    return this.dataSource;
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
