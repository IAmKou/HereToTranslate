import { Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MySqlConnection {
  private static instance: MySqlConnection;

  // TypeORM DataSource instance
  private dataSource !: DataSource;

  private readonly logger = new Logger(MySqlConnection.name);

  constructor(private readonly config: ConfigService) {
    if (MySqlConnection.instance) return MySqlConnection.instance;
    MySqlConnection.instance = this;
  }

  // Init MySQL connection
  async init() {
    this.dataSource = new DataSource({
      type: 'mysql',
      host: this.config.get<string>('localhost'),
      port: this.config.get<number>('3306'),
      username: this.config.get<string>('root'),
      password: this.config.get<string>('123456'),
      database: this.config.get<string>('htt'),
      synchronize: true, // Auto create tables (turn off in production if needed)
      logging: false,
      entities: [], // Add entities here
    });

    await this.dataSource.initialize();
    this.logger.log('Connected to MySQL database');
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
