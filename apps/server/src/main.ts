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
      'http://localhost:4200',  // Always allow localhost for development
      process.env.CLIENT_URL || 'http://localhost:4200',
      process.env.PRODUCTION_URL || 'https://htt-ekpa.onrender.com',
      /^http:\/\/26\.82\.216\.\d+:4200$/ ,
      'https://heretotranslate-lrdi.onrender.com'// Allow any IP in RadVPN range
    ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  });
  const globalPrefix = 'api';
  app.setGlobalPrefix(globalPrefix);

  // Health check endpoint using Express directly (after global prefix)
  const expressApp = app.getHttpAdapter().getInstance();
  expressApp.get('/', (req, res) => {
    res.json({
      message: 'HereToTranslate API Server is running!',
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      endpoints: {
        auth: '/api/auth',
        tasks: '/api/tasks',
        chat: '/api/chat',
        categories: '/api/categories',
        translation: '/api/translation',
        ai: '/api/ai'
      }
    });
  });

  const port: number = process.env.PORT ? Number(process.env.PORT) : 3000;
  await app.listen(port, '0.0.0.0');
  Logger.log(
    `🚀 Application is running on: http://localhost:${port}`
  );
}
bootstrap();
