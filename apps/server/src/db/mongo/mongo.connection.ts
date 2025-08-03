import { Injectable, Logger } from '@nestjs/common';
import { MongoClient, Db as MongoDatabase } from 'mongodb';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MongoDbConnection {
  private static instance: MongoDbConnection;

  private client !: MongoClient;
  private db !: MongoDatabase;

  private readonly logger = new Logger(MongoDbConnection.name);

  constructor(private readonly config: ConfigService) {
    if (MongoDbConnection.instance) return MongoDbConnection.instance;
    MongoDbConnection.instance = this;
  }

  async init() {
    const uri = this.config.get<string>('MONGODB_URI');
    if (typeof uri === 'string') {
      this.client = new MongoClient(uri);
    }


    await this.client.connect();
    const dbName = this.config.get<string>('MONGODB_DB');
    this.db = this.client.db(dbName);

    this.logger.log(`Connected to MongoDB database: ${dbName}`);
  }

  // Get the Mongo database instance
  getDb(): MongoDatabase {
    return this.db;
  }

  // Close the MongoDB connection
  async close() {
    await this.client.close();
    this.logger.log('MongoDB connection closed');
  }

  // Reconnect to MongoDB
  async reconnect() {
    await this.close();
    await this.init();
    this.logger.log('MongoDB reconnected');
  }
}
