import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DbContextModule } from '../db/db.module';
import { MongoController } from '../controller/mongo.controller';
import { SeederModule} from '../module/seeder.module';
import { AuthModule } from '../auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { PostModule } from '../post/post.module';
import { RequestModule } from '../request/request.module';
import { ProjectModule } from '../project/project.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    DbContextModule, SeederModule, AuthModule , PostModule, RequestModule, ProjectModule],
  controllers: [AppController, MongoController],
  providers: [AppService],
})
export class AppModule {
}
