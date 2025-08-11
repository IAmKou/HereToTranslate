import { Controller, Post, Get, Body, Param, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { AuthenticatedRequest } from '../../auth/interfaces/authenticated-request.interface';
import { TaskAssignmentManagerService } from '../service/task-assignment-manager.service';
import { AssignTaskDto, ReassignTaskDto } from '#LocalProject/Dtos';

@Controller('task-assignment')
export class TaskAssignmentController {
  constructor(
    private readonly taskAssignmentService: TaskAssignmentManagerService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post('assign')
  async assignTask(
    @Body() dto: AssignTaskDto,
    @Req() req: AuthenticatedRequest,
  ) {
    // Extract projectId from the task itself
    const task = await this.taskAssignmentService.getTaskAssignments(dto.taskId);
    const projectId = task.task.projectId?.toString();
    
    if (!projectId) {
      throw new Error('Task must be associated with a project');
    }

    return this.taskAssignmentService.assignTask(projectId, dto, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('reassign')
  async reassignTask(
    @Body() dto: ReassignTaskDto,
    @Req() req: AuthenticatedRequest,
  ) {
    // Extract projectId from the task itself
    const task = await this.taskAssignmentService.getTaskAssignments(dto.assignmentId);
    const projectId = task.task.projectId?.toString();
    
    if (!projectId) {
      throw new Error('Task must be associated with a project');
    }

    return this.taskAssignmentService.reassignTask(projectId, dto, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('task/:taskId')
  async getTaskAssignments(@Param('taskId') taskId: string) {
    return this.taskAssignmentService.getTaskAssignments(taskId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('task/:taskId/history')
  async getAssignmentHistory(@Param('taskId') taskId: string) {
    return this.taskAssignmentService.getAssignmentHistory(taskId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('project/:projectId/participants')
  async getProjectParticipants(@Param('projectId') projectId: string) {
    return this.taskAssignmentService.getProjectParticipants(projectId);
  }
}