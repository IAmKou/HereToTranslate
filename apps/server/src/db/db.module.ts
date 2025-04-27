import { ConsoleLogger, FactoryProvider, Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SQLContext } from './mysql.service';
import { DataSource } from 'typeorm';
import { MongoDbContext } from './mongo.service';
import { MongoClient } from 'mongodb';

export const mySqlProvider: FactoryProvider<SQLContext> = {
  useFactory: (logger: ConsoleLogger, config : ConfigService) => {
    const dataSource = new DataSource({
      type: 'mysql',
      host: config.get('DB_HOST',process.env.MYSQL_HOST),
      port: config.get<number>('DB_PORT', 3306),
      username: config.get('DB_USERNAME',process.env.MYSQL_USER),
      password: config.get('DB_PASSWORD', process.env.MYSQL_PASSWORD),
      database: config.get('DB_NAME', process.env.MYSQL_DATABASE),
      entities:[],
      synchronize: true,
      logging: true,
    });
    return new SQLContext(dataSource,logger);

  },
  inject: [ConsoleLogger,ConfigService],
  provide: SQLContext,
};

export const mongoDbProvider: FactoryProvider<MongoDbContext> = {
  useFactory: async (logger: ConsoleLogger, config: ConfigService) => {
    const uri = config.get<string>('MONGODB_URI', 'mongodb://localhost:27017');
    const dbName = config.get<string>('MONGODB_DB', 'mydatabase');

    const client = new MongoClient(uri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    } as any); // ignore tiny typing issues, optional

    await client.connect();

    return new MongoDbContext(client, logger, dbName);
  },
  inject: [ConsoleLogger, ConfigService],
  provide: MongoDbContext,
};


@Global()
@Module({
  imports: [],
  providers: [mySqlProvider, mongoDbProvider],
  controllers:[],
  exports:[SQLContext]
})
export class DatabaseModule {}
