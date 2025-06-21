import { Logger, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DbContextService } from './dbcontext.service';
import { MySqlConnection } from './mysql/mysql.connection';
import { MongoDbConnection } from './mongo/mongo.connection';
import { MongooseModule } from '@nestjs/mongoose';
import { ConnectionStates } from 'mongoose';

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const mysqlConnection = new MySqlConnection(configService);
        await mysqlConnection.init();
        return mysqlConnection.getDataSource().options;
      },
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const logger = new Logger('MongooseModule');
        return ({
          useBigInt64: true,

          onConnectionCreate(connection) {
            const { readyState } = connection;
            connection.on('connected', c => logger.log(c));
            logger.log(`Connection created: [${ConnectionStates[readyState]}`);
            return connection;
          },
          connectionErrorFactory(error) {
            logger.error(`MongoDB connection error: ${error.message}`);
            return error;
          },
          uri: configService.get<string>('MONGODB_URI'),
        });
      },
    }),
  ],
  providers: [DbContextService, MySqlConnection, MongoDbConnection],
  exports: [DbContextService, TypeOrmModule, MongooseModule],
})
export class DbContextModule {}
