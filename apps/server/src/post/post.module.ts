import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PostController } from './post.controller';
import { PostService } from './post.service';
import { RateEntity } from '../db/mysql/entity/rate.entity';
import { CommentEntity } from '../db/mysql/entity/comment.entity';

@Module({
  imports: [TypeOrmModule.forFeature([RateEntity, CommentEntity])],
  controllers: [PostController],
  providers: [PostService],
})
export class PostModule {}
