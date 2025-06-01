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
      host: this.config.get<string>('MYSQL_HOST'),
      port: this.config.get<number>('MYSQL_PORT'),
      username: this.config.get<string>('MYSQL_USER'),
      password: this.config.get<string>('MYSQL_PASSWORD'),
      database: this.config.get<string>('MYSQL_DATABASE'),
      synchronize: false, // Auto create tables (turn off in production)
      logging: true,
      entities: [__dirname + '/../**/*.entity{.ts,.js}'], // Add entities here
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
