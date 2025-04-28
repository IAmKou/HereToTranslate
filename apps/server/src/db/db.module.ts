import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongoDbConnection } from './mongo/mongo.connection';
import { MySqlConnection } from './mysql/mysql.connection';
import { DbContextService } from './dbcontext.service';

@Module({
  imports: [ConfigModule], // Import ConfigModule for environment variables
  providers: [
    MongoDbConnection, // MongoDB connection provider
    MySqlConnection,   // MySQL connection provider
    DbContextService,  // Central service managing all DB connections
  ],
  exports: [DbContextService], // Export DbContextService so it can be injected elsewhere
})
export class DbContextModule {}
