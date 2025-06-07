/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module';

async function bootstrap() {
  console.log('Starting server bootstrap process...'); // Add this line
  try {
    const app = await NestFactory.create(AppModule);
    console.log('NestJS application created'); // This should now show
    app.enableCors({
      origin: 'http://localhost:4200', // Vue dev server
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
    })
    const globalPrefix = 'api';
    app.setGlobalPrefix(globalPrefix);
    const port = process.env.PORT || 3000;
    console.log(
      `🚀 Application is running on: http://localhost:${port}`
    );
    await app.listen(port);
  } catch (error) {
    console.error('Error creating NestJS application:', error);
  }
}

bootstrap();
