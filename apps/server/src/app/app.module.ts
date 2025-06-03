import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DbContextModule } from '../db/db.module';
import { MongoController } from '../controller/mongo.controller';
import { SeederModule} from '../module/seeder.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [DbContextModule, SeederModule, AuthModule],
  controllers: [AppController, MongoController],
  providers: [AppService],
})
export class AppModule {
}
