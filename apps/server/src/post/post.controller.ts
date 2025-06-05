import { Controller, Post, Patch, Delete, Body, Param, Req, UseGuards } from '@nestjs/common';
import { PostService } from './post.service';
import { UpdateRateDto } from '../db/dto/rate.dto';
import { CreateCommentDto, UpdateCommentDto, ReportCommentDto } from '../db/dto/comment.dto';
import { JwtAuthGuard } from '../auth/jwt.guard';
import { Request } from 'express';

interface AuthenticatedRequest extends Request {
  user: {
    sub: number;
  };
}

@Controller('post')
export class PostController {
  constructor(private readonly postService: PostService) {}

  @UseGuards(JwtAuthGuard)
  @Patch('rate/:id')
  updateRate(@Param('id') id: string, @Body() dto: UpdateRateDto, @Req() req: AuthenticatedRequest) {
    return this.postService.updateRate(+id, dto, req.user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post('comment')
  createComment(@Body() dto: CreateCommentDto, @Req() req: AuthenticatedRequest) {
    return this.postService.createComment(dto, req.user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('comment/:id')
  updateComment(@Param('id') id: string, @Body() dto: UpdateCommentDto, @Req() req: AuthenticatedRequest) {
    return this.postService.updateComment({ ...dto, id: +id }, req.user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('comment/:id')
  deleteComment(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    return this.postService.deleteComment(+id, req.user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post('comment/report')
  reportComment(@Body() dto: ReportCommentDto, @Req() req: AuthenticatedRequest) {
    return this.postService.reportComment(dto, req.user.sub);
  }
}
