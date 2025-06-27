import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RateEntity } from '../db/mysql/entity/rate.entity';
import { CommentEntity } from '../db/mysql/entity/comment.entity';
import { UpdateRateDto } from '../db/dto/rate.dto';
import { CreateCommentDto, UpdateCommentDto, ReportCommentDto } from '../db/dto/comment.dto';

@Injectable()
export class PostService {
  constructor(
    @InjectRepository(RateEntity) private rateRepo: Repository<RateEntity>,
    @InjectRepository(CommentEntity) private commentRepo: Repository<CommentEntity>,
  ) {}

  async updateRate(rateId: number, dto: UpdateRateDto, userId: number) {
    const rate = await this.rateRepo.findOne({ where: { id: rateId }, relations: ['user'] });
    if (!rate || rate.user.id !== BigInt(userId)) {
      throw new UnauthorizedException('You cannot edit this rating');
    }
    rate.score = dto.score;
    return this.rateRepo.save(rate);
  }

  async createComment(dto: CreateCommentDto, userId: number) {
    const comment = this.commentRepo.create({
      post: { id: dto.postId } as any,
      user: { id: BigInt(userId) } as any,
      content: dto.content,
    });
    return this.commentRepo.save(comment);
  }

  async updateComment(dto: UpdateCommentDto, userId: number) {
    const comment = await this.commentRepo.findOne({ where: { id: dto.id }, relations: ['user'] });
    if (!comment || comment.user.id !== BigInt(userId)) {
      throw new UnauthorizedException('You cannot edit this comment');
    }
    comment.content = dto.content;
    return this.commentRepo.save(comment);
  }

  async deleteComment(id: number, userId: number) {
    const comment = await this.commentRepo.findOne({ where: { id }, relations: ['user'] });
    if (!comment || comment.user.id !== BigInt(userId)) {
      throw new UnauthorizedException('You cannot delete this comment');
    }
    return this.commentRepo.remove(comment);
  }

  async reportComment(dto: ReportCommentDto, userId: number) {
    console.log(`User ${userId} reported comment ${dto.commentId} for reason: ${dto.reason}`);
    return { message: 'Reported successfully' };
  }
}
