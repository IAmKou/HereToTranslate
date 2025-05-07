import { Injectable, Logger } from '@nestjs/common';
import { MongoClient, Db } from 'mongodb';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MongoDbConnection {
  // tao bien static de dam bao tinh singleton
  private static instance: MongoDbConnection;

  // ref client , db mongo
  private client !: MongoClient;
  private db !: Db;

  private readonly logger = new Logger(MongoDbConnection.name);

  constructor(private readonly config: ConfigService) {
    //Return bien dang ton tai neu da dc khoi tao (Singleton)
    if (MongoDbConnection.instance) return MongoDbConnection.instance;
    MongoDbConnection.instance = this;
  }

  // Init mongodb connection
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
  getDb(): Db {
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
