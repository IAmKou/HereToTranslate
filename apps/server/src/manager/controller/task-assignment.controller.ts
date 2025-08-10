import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { TaskAssignmentService } from '../service/task-assignment.service';
import { JwtAuthGuard } from '../../auth/guards/jwt.guard';

interface ReassignTaskByTaskDto {
  taskId: string;
  role: string;
  newAssigneeId: string;
  reason?: string;
  notes?: string;
}

@Controller('api/task-assignments')
@UseGuards(JwtAuthGuard)
export class TaskAssignmentController {
  constructor(private readonly taskAssignmentService: TaskAssignmentService) {}

  @Post('reassign')
  async reassignTask(@Body() dto: ReassignTaskByTaskDto, @Request() req: any) {
    const userId = req.user.id;
    return await this.taskAssignmentService.reassignTaskByTask(dto, userId.toString());
  }
}
