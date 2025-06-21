import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
  UseInterceptors,
  ValidationPipe
} from '@nestjs/common';
import { JwtFallthroughGuard } from '#LocalProject/Auth/guards/jwt-fallthrough.guard';
import { IsPublicEndpoint } from '#LocalProject/Auth/decorators';
import { BigIntTransformPipe } from '#LocalProject/Utils/pipes/bigint-transform.pipe';
import type { AuthenticatedRequest } from '#LocalProject/Auth/types';
import { JwtAuthGuard } from '#LocalProject/Auth/guards/jwt.guard';
import { CreateDiscussionDto, PostCommentDto, UpdateCommentDto, UpdateDiscussionDto } from '#LocalProject/Dtos';
import { DiscussionManagerService } from '#LocalProject/Managers/service/discussion-manager.service';
import { JsonSerializerInterceptor } from '#LocalProject/Utils/json-serializer.interceptor';

@Controller('projects/:projectId/discussions')
@UseInterceptors(JsonSerializerInterceptor)
export class DiscussionController {
  constructor(private readonly discussions: DiscussionManagerService) {
  }

  @UseGuards(JwtFallthroughGuard)
  @IsPublicEndpoint()
  @Get()
  async fetchProjectDiscussions(
    @Param('projectId', BigIntTransformPipe) projectId: bigint,
    @Req() req: Partial<AuthenticatedRequest>
  ) {
    return this.discussions.fetchDiscussions(req.user?.id, projectId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('create')
  async createDiscussion(
    @Param('projectId', BigIntTransformPipe) projectId: bigint,
    @Body(ValidationPipe) discussionData: CreateDiscussionDto,
    @Req() req: AuthenticatedRequest
  ) {
    return this.discussions.createDiscussion(req.user.id, projectId, discussionData);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':threadId')
  async updateDiscussionMetadata(
    @Param('projectId', BigIntTransformPipe) projectId: bigint,
    @Param('threadId', BigIntTransformPipe) threadId: bigint,
    @Body(ValidationPipe) discussionUpdateData: UpdateDiscussionDto, // Replace with actual DTO
    @Req() req: AuthenticatedRequest
  ) {
    return this.discussions.updateDiscussionMetadata(req.user.id, projectId, threadId, discussionUpdateData);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':threadId/archive')
  async archiveDiscussion(
    @Param('projectId', BigIntTransformPipe) projectId: bigint,
    @Param('threadId', BigIntTransformPipe) threadId: bigint,
    @Req() req: AuthenticatedRequest
  ) {
    return this.discussions.archiveDiscussion(req.user.id, projectId, threadId);
  }

  @UseGuards(JwtFallthroughGuard)
  @IsPublicEndpoint()
  @Get(':threadId')
  async fetchDiscussionThread(
    @Param('projectId', BigIntTransformPipe) projectId: bigint,
    @Param('threadId', BigIntTransformPipe) threadId: bigint,
    @Req() req: Partial<AuthenticatedRequest>
  ) {
    // TODO: Some threads can be publicly accessed without authentication
    return this.discussions.fetchDiscussion(req.user?.id, projectId, threadId);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':threadId/post')
  async postDiscussionComment(
    @Param('threadId', BigIntTransformPipe) threadId: bigint,
    @Body(ValidationPipe) commentData: PostCommentDto,
    @Req() req: AuthenticatedRequest
  ) {
    return this.discussions.postComment(req.user.id, threadId, commentData);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':threadId/:commentId')
  async updateDiscussionComment(
    @Param('threadId', BigIntTransformPipe) threadId: bigint,
    @Param('commentId', BigIntTransformPipe) commentId: bigint,
    @Body(ValidationPipe) commentUpdateData: UpdateCommentDto,
    @Req() req: AuthenticatedRequest
  ) {
    return this.discussions.updateDiscussionComment(req.user.id, threadId, commentId, commentUpdateData);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':threadId/:commentId')
  async deleteDiscussionComment(
    @Param('threadId', BigIntTransformPipe) threadId: bigint,
    @Param('commentId', BigIntTransformPipe) commentId: bigint,
    @Req() req: AuthenticatedRequest
  ) {
    return this.discussions.deleteDiscussionComment(req.user.id, threadId, commentId);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':threadId/:commentId/upvote')
  async upvoteDiscussionComment(
    @Param('threadId', BigIntTransformPipe) threadId: bigint,
    @Param('commentId', BigIntTransformPipe) commentId: bigint,
    @Req() req: AuthenticatedRequest
  ) {
    return this.discussions.upvoteDiscussionComment(req.user.id, threadId, commentId);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':threadId/:commentId/downvote')
  async downvoteDiscussionComment(
    @Param('threadId', BigIntTransformPipe) threadId: bigint,
    @Param('commentId', BigIntTransformPipe) commentId: bigint,
    @Req() req: AuthenticatedRequest
  ) {
    return this.discussions.downvoteDiscussionComment(req.user.id, threadId, commentId);
  }
}
