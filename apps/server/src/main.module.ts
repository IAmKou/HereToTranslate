import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { EnvConfigs } from './env.schema';
import { DbContextModule } from './db/db.module';
import { AuthModule } from './auth/auth.module';
import { SeederModule } from './seeder/seeder.module';
import { ManagersModule } from './manager/managers.module';
import { JsonSerializerInterceptor } from './util/json-serializer.interceptor';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import * as path from 'path';
import { ChatModule } from './chat/chat.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../.env', '../../.env'], 
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
    MailerModule.forRoot({
      transport: {
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: 'csgit47@gmail.com',
          pass: 'svvuwvdjrbiucehn',
        },
      },
      defaults: {
        from: '"Here To Translate Support" <csgit47@gmail.com>',
      },
      template: {
        dir: path.join(__dirname, 'mailer', 'templates'),
        adapter: new HandlebarsAdapter(),
        options: {
          strict: true,
        },
      },
    }),
    DbContextModule,
    SeederModule,
    AuthModule,
    ManagersModule,
    ChatModule,
    ScheduleModule.forRoot()

  ],
  controllers: [],
  providers: [
    JsonSerializerInterceptor
  ],
})
export class MainModule {
}
