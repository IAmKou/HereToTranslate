import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
  UseInterceptors,
  Req,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { JsonSerializerInterceptor } from '../../util/json-serializer.interceptor';
import { TaskCommentManagerService } from '../service/task-comment-manager.service';
import { CreateTCommentDto, UpdateTCommentDto } from '../../dto/task-comment.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt.guard';
import { AuthenticatedRequest } from '../../auth/types';

@Controller('tasks')
@UseGuards(JwtAuthGuard)
@UseInterceptors(JsonSerializerInterceptor)
export class TaskCommentController {
  constructor(private readonly taskCommentService: TaskCommentManagerService) {}

  @Get(':taskId/comments')
  async getTaskComments(@Param('taskId') taskId: string) {
    try {
      return await this.taskCommentService.getTaskComments(taskId);
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to get task comments',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Post(':taskId/comments')
  async addTaskComment(
    @Param('taskId') taskId: string,
    @Body() dto: CreateTCommentDto,
    @Req() req: AuthenticatedRequest
  ) {
    try {
      const userId = req.user.id;
      return await this.taskCommentService.addTaskComment(taskId, dto, userId.toString());
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to add comment',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Patch('comments/:commentId')
  async updateTaskComment(
    @Param('commentId') commentId: string,
    @Body() dto: UpdateTCommentDto,
    @Req() req: AuthenticatedRequest
  ) {
    try {
      const userId = req.user.id;
      return await this.taskCommentService.updateTaskComment(commentId, dto, userId.toString());
    } catch (error) {
      throw new HttpException(
        error.message || 'Failed to update comment',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Delete('comments/:commentId')
  async deleteTaskComment(
    @Param('commentId') commentId: string,
    @Req() req: AuthenticatedRequest
  ) {
    try {
      console.log('Deleting comment:', commentId, 'by user:', req.user.id);
      const userId = req.user.id;
      const result = await this.taskCommentService.deleteTaskComment(commentId, userId.toString());
      console.log('Comment deleted successfully:', result);
      return result;
    } catch (error) {
      console.error('Error deleting comment:', error);
      throw new HttpException(
        error.message || 'Failed to delete comment',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
