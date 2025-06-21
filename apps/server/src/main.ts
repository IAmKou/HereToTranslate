/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { MainModule } from './main.module';
import { shared } from '@here-to-translate/common';
import { BigIntSerializerInterceptor } from './util/bigint-serializer.interceptor';

async function bootstrap() {
  shared();
  const app = await NestFactory.create(MainModule);
  app.useGlobalPipes(new ValidationPipe(
    {
      enableDebugMessages: true,

    }
  ));
  app.useGlobalInterceptors(new BigIntSerializerInterceptor());
  app.enableCors({
    origin: 'http://localhost:4200', // Vue dev server
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTION'],
  });
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);
  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  Logger.log(
    `🚀 Application is running on: http://localhost:${port}`
  );
}
bootstrap();
