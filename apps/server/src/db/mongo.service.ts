import { ConsoleLogger, Injectable } from '@nestjs/common';
import { MongoClient } from 'mongodb';


@Injectable()
export class MongoDbContext {
  // private readonly db: Db;
  constructor(
    private readonly client: MongoClient,
    private readonly logger: ConsoleLogger,
    // private readonly databaseName: string
  ) {
    // this.db = this.client.db(this.databaseName);
    this.logger.log('MongoDB Initialized', 'MongoDbContext');
  }
  async restartConnection(force = false) {
    if (force) {
      await this.client.close();
    }
    // if (!this.client.topology?.isConnected()){
    //   await  this.client.connect();
    // }
  }
  // collection<TSchema = any>(name: string): Collection<TSchema> {
  //   return this.db.collection<TSchema>(name);
  // }
}
