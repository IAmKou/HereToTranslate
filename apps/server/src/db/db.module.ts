import { Logger, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DbContextService } from './dbcontext.service';
import { MySqlConnection } from './mysql/mysql.connection';
import { MongoDbConnection } from './mongo/mongo.connection';
import { MongooseModule } from '@nestjs/mongoose';
import { MongoTest, MongoTestSchema } from './mongo/schema/mongo-test.schema';
import { MongoService } from '../service/mongo.service';
import { Connection as MongooseConnection } from 'mongoose';

@Module({
  imports: [
    ConfigModule, // Needed for ConfigService
    // Configure TypeORM with a dynamic DataSource provider
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const mysqlConnection = new MySqlConnection(configService);
        await mysqlConnection.init(); // Initialize the DataSource
        return mysqlConnection.getDataSource().options; // Return DataSource options
      },
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const logger = new Logger('MongooseModule');
        return ({
          onConnectionCreate(connection: MongooseConnection) {
            connection.on('connected', c => logger.log(c));
            logger.log(`MongoDB connection created: ${connection.user}:${connection.host} on ${connection.db?.databaseName}`);
            return connection;
          },
          connectionErrorFactory(error) {
            logger.error(`MongoDB connection error: ${error.message}`);
            return error;
          },
          uri: configService.get<string>('MONGODB_URI', 'mongodb://127.0.0.1:27017/htt'),
        });
      },
    }),
    MongooseModule.forFeature([{ name: MongoTest.name, schema: MongoTestSchema }]),
  ],
  providers: [DbContextService, MySqlConnection, MongoDbConnection, MongoService],
  exports: [DbContextService, TypeOrmModule, MongooseModule, MongoService],
})
export class DbContextModule {}
