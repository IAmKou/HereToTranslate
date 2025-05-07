import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DbContextModule } from '../db/db.module';
import { TestController } from '../controller/test.controller';
import { TestService } from '../service/test.service';
import { MongoController } from '../controller/mongo.controller';


@Module({
  imports: [DbContextModule],
  controllers: [AppController, TestController, MongoController],
  providers: [AppService, TestService],
})
export class AppModule {
}
