import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RequestController } from './request.controller';
import { RequestService } from './request.service';
import { RequestEntity } from '../db/mysql/entity/request.entity';

@Module({
  imports: [TypeOrmModule.forFeature([RequestEntity])],
  controllers: [RequestController],
  providers: [RequestService],
})
export class RequestModule {}
