import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { RoleEntity } from './entity/role.entity';
import { UserEntity } from './entity/user.entity';
import { BranchEntity } from './entity/branch.entity';
import { PostEntity } from './entity/post.entity';
import { ProjectEntity } from './entity/project.entity';
import { Category } from './entity/category.entity';
import { CommentEntity } from './entity/comment.entity';
import { FileEntity } from './entity/file.entity';
import { GroupMemberEntity } from './entity/groupMember.entity';
import { ProjectGroupEntity } from './entity/projectGroup.entity';
import { ProjectRoleEntity } from './entity/projectRole.entity';
import { RateEntity } from './entity/rate.entity';
import { Report } from './entity/report.entity';
import { RequestEntity } from './entity/request.entity';
import { TaskEntity } from './entity/task.entity';
import { TransactionEntity } from './entity/transaction.entity';
import { CommitEntity } from './entity/commit.entity';
import { SubCategoryEntity } from './entity/subCategory.entity';


@Injectable()
export class MySqlConnection {
  private static instance: MySqlConnection;

  // TypeORM DataSource instance
  private readonly dataSource !: DataSource;

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
      synchronize: true, // Auto create tables (turn off in production)
      logging: true,
      entities: [RoleEntity, UserEntity, BranchEntity, PostEntity, ProjectEntity, Category, CommentEntity, FileEntity,
        GroupMemberEntity, ProjectGroupEntity, ProjectRoleEntity, RateEntity, Report, RequestEntity, TaskEntity,
        TransactionEntity, CommitEntity, SubCategoryEntity], // Add entities here
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
