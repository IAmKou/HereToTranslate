import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { JsonSerializerInterceptor } from '../../util/json-serializer.interceptor';
import { TaskManagerService } from '../service/task-manager.service';
import { CreateTaskDto, UpdateTaskDto } from '../../dto/task.dto';
import { JwtAuthGuard } from '#LocalProject/Auth/guards/jwt.guard';
import type { AuthenticatedRequest } from '#LocalProject/Auth/types';
import { BigIntTransformPipe } from '#LocalProject/Utils/pipes/bigint-transform.pipe';

@Controller('tasks')
@UseGuards(JwtAuthGuard)
@UseInterceptors(JsonSerializerInterceptor)
export class TaskController {
  constructor(private readonly taskService: TaskManagerService) {}

  @Post()
  async createTask(
    @Body() dto: CreateTaskDto,
    @Req() req: AuthenticatedRequest
  ) {
    const userId = req.user.id;
    return await this.taskService.createTask({
      ...dto,
      createdById: userId.toString(),
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
    });
  }

  @Get('/project/:projectId')
  async getProjectTasks(@Param('projectId') projectId: string) {
    return await this.taskService.getTasksByProject(projectId);
  }

  @Get(':id')
  async getTask(@Param('id') id: string) {
    return await this.taskService.getTask(id);
  }

  @Patch(':id')
  async updateTask(@Param('id') id: string, @Body() dto: UpdateTaskDto) {
    return await this.taskService.updateTask(id, dto);
  }

  @Delete(':id')
  async deleteTask(@Param('id') id: string) {
    return await this.taskService.deleteTask(id);
  }

  @Patch(':id/close')
  async closeTask(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const userId = req.user.id;
    return await this.taskService.closeTask(id, userId.toString());
  }

  @Patch(':id/reopen')
  async reopenTask(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const userId = req.user.id;
    return await this.taskService.reopenTask(id, userId.toString());
  }

  @Get('/user/:userId')
  async getUserTasks(@Param('userId') userId: string) {
    return await this.taskService.getTasksByUser(userId);
  }

  @Get(':id/progress')
  async getTaskProgress(@Param('id', BigIntTransformPipe) id: bigint) {
    try {
      return await this.taskService.getTaskProgress(id);
    } catch (error) {
      throw new HttpException(
        error || 'Failed to get task progress',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get(':id/history')
  async getTaskHistory(@Param('id') id: string) {
    try {
      return await this.taskService.getTaskHistory(id);
    } catch (error) {
      throw new HttpException(
        error || 'Failed to get task history',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }
}
