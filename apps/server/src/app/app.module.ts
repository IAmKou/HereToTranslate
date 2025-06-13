import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DbContextModule } from '../db/db.module';
import { MongoController } from '../controller/mongo.controller';
import { SeederModule } from '../module/seeder.module';
import { AuthModule } from '../auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { ProjectModule } from '../project/project.module';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { EnvConfigs } from './env.schema';
import { CategoryModule } from '../category/category.module';
import { SubCategoryModule } from '../subCategory/sub.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate(config) {
        const instance = plainToInstance(
          EnvConfigs,
          config,
          { enableImplicitConversion: true }
        );
        const errors = validateSync(instance, { skipMissingProperties: false });
        if (errors.length > 0) {
          throw new Error(errors.toString());
        }
        return instance;
      },
    }),
    DbContextModule, SeederModule, AuthModule, ProjectModule, CategoryModule, SubCategoryModule, UsersModule],
  controllers: [AppController, MongoController],
  providers: [AppService],
})
export class AppModule {
}
