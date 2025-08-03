import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { MongoDbConnection } from './mongo/mongo.connection';
import { MySqlConnection } from './mysql/mysql.connection';

@Injectable()
export class DbContextService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DbContextService.name);

  constructor(
    private readonly mongoDb: MongoDbConnection,
    private readonly mySqlDb: MySqlConnection,
  ) {}

  // Automatically called when the NestJS module is initialized
  async onModuleInit() {
    this.logger.log('DbContextService initialized successfully.');
  }

  // Automatically called when the NestJS module is shutting down
  async onModuleDestroy() {
    this.logger.log('DbContextService shutting down...');
    await Promise.all([
      this.mongoDb.close(),   // Close MongoDB connection
      this.mySqlDb.close(),   // Close MySQL connection
    ]);
    this.logger.log('DbContextService shut down successfully.');
  }

  // Getter for MongoDB
  get mongo() {
    return this.mongoDb.getDb();
  }

  // Getter for MySQL
  get mysql() {
    return this.mySqlDb.dataSource;
  }

  // Manual reconnect function for all databases
  async reconnectAll() {
    this.logger.warn('Reconnecting all databases...');
    await Promise.all([
      this.mongoDb.reconnect(),
      this.mySqlDb.reconnect(),
    ]);
    this.logger.log('All databases reconnected successfully.');
  }
}
