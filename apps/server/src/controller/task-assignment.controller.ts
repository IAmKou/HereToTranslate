import { Controller, Post, Get, Body, Param, UseGuards, Request } from '@nestjs/common';
import { TaskAssignmentManagerService } from '#LocalProject/Managers/service/task-assignment-manager.service';
import { AssignTaskDto, ReassignTaskDto } from '#LocalProject/Dtos';
import { JwtAuthGuard } from '#LocalProject/Guards/jwt-auth.guard';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Task Assignment')
@Controller('task-assignment')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TaskAssignmentController {
  constructor(
    private readonly taskAssignmentService: TaskAssignmentManagerService,
  ) {}

  @Post('assign')
  @ApiOperation({ summary: 'Assign task to users' })
  @ApiResponse({ status: 200, description: 'Task assigned successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Task or user not found' })
  async assignTask(
    @Body() dto: AssignTaskDto,
    @Request() req: any,
  ) {
    // Extract projectId from the task or use a different approach
    // For now, we'll need to get projectId from the task
    const task = await this.taskAssignmentService.getTaskAssignments(dto.taskId);
    const projectId = task.task.projectId;
    
    if (!projectId) {
      throw new Error('Project ID not found for task');
    }

    return await this.taskAssignmentService.assignTask(
      projectId,
      dto,
      req.user.id,
    );
  }

  @Post('reassign')
  @ApiOperation({ summary: 'Reassign task to different users' })
  @ApiResponse({ status: 200, description: 'Task reassigned successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 404, description: 'Task or user not found' })
  async reassignTask(
    @Body() dto: ReassignTaskDto,
    @Request() req: any,
  ) {
    const task = await this.taskAssignmentService.getTaskAssignments(dto.taskId);
    const projectId = task.task.projectId;
    
    if (!projectId) {
      throw new Error('Project ID not found for task');
    }

    return await this.taskAssignmentService.reassignTask(
      projectId,
      dto,
      req.user.id,
    );
  }

  @Get('task/:taskId')
  @ApiOperation({ summary: 'Get task assignments' })
  @ApiResponse({ status: 200, description: 'Task assignments retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async getTaskAssignments(@Param('taskId') taskId: string) {
    return await this.taskAssignmentService.getTaskAssignments(taskId);
  }

  @Get('task/:taskId/history')
  @ApiOperation({ summary: 'Get task assignment history' })
  @ApiResponse({ status: 200, description: 'Assignment history retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Task not found' })
  async getAssignmentHistory(@Param('taskId') taskId: string) {
    return await this.taskAssignmentService.getAssignmentHistory(taskId);
  }

  @Get('project/:projectId/participants')
  @ApiOperation({ summary: 'Get project participants for assignment' })
  @ApiResponse({ status: 200, description: 'Project participants retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Project not found' })
  async getProjectParticipants(@Param('projectId') projectId: string) {
    return await this.taskAssignmentService.getProjectParticipants(projectId);
  }
}
