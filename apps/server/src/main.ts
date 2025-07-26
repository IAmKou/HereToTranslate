/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MainModule } from './main.module';
import { shared } from '@here-to-translate/common';
import { BigIntSerializerInterceptor } from './util/bigint-serializer.interceptor';
import cookieParser from 'cookie-parser';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';
import * as express from 'express';

async function bootstrap() {
  shared();
  // Sử dụng NestExpressApplication để dùng useStaticAssets
  const app = await NestFactory.create<NestExpressApplication>(MainModule);
  app.use(cookieParser());

  app.use(
    '/uploads',
    express.static(join(__dirname, '..', '..', '..', 'uploads')),
  );


  app.useGlobalPipes(new ValidationPipe(
    {
      enableDebugMessages: true,

    }
  ));
  app.useGlobalInterceptors(new BigIntSerializerInterceptor());
  app.enableCors({
    origin: [
      'http://localhost:4200',
      'http://26.82.216.71:4200'
    ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  });
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);

  const port: number = process.env.PORT ? Number(process.env.PORT) : 3000;
  await app.listen(port, '0.0.0.0');
  Logger.log(
    `🚀 Application is running on: http://localhost:${port}`
  );
}
bootstrap();
