import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { plainToInstance } from 'class-transformer';
import { validateSync } from 'class-validator';
import { EnvConfigs } from './env.schema';
import { DbContextModule } from './db/db.module';
import { AuthModule } from './auth/auth.module';
import { SeederModule } from './seeder/seeder.module';
import { ManagersModule } from './manager/managers.module';

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
    DbContextModule,
    SeederModule,
    AuthModule,
    ManagersModule
  ],
  controllers: [],
})
export class MainModule {
}
