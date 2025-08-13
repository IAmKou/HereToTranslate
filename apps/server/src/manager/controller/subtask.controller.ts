import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { SubtaskManagerService } from '../service/subtask-manager.service';
import { JwtGuard } from '#LocalProject/Auth/guards/jwt.guard';
import { IsPublicEndpoint } from '#LocalProject/Auth/decorators/is-public-endpoint.decorator';
import { CreateSubtaskDto, UpdateSubtaskDto, TransitionSubtaskDto } from '#LocalProject/Dtos';

@Controller('subtasks')
@UseGuards(JwtGuard)
export class SubtaskController {
  constructor(private readonly subtaskService: SubtaskManagerService) {}

  @Post()
  async createSubtask(@Body() dto: CreateSubtaskDto, @Request() req: any) {
    return await this.subtaskService.createSubtask({
      ...dto,
      createdById: req.user.id,
    });
  }

  @Get(':id')
  async getSubtask(@Param('id') id: string) {
    return await this.subtaskService.getSubtask(id);
  }

  @Get('task/:taskId')
  async getSubtasksByTask(@Param('taskId') taskId: string) {
    return await this.subtaskService.getSubtasksByTask(taskId);
  }

  @Put(':id')
  async updateSubtask(
    @Param('id') id: string,
    @Body() dto: UpdateSubtaskDto,
    @Request() req: any
  ) {
    return await this.subtaskService.updateSubtask(id, dto, req.user.id);
  }

  @Delete(':id')
  async deleteSubtask(@Param('id') id: string) {
    return await this.subtaskService.deleteSubtask(id);
  }

  @Post('check-overdue')
  @IsPublicEndpoint()
  async checkOverdueStatus() {
    return await this.subtaskService.checkAndUpdateOverdueStatus();
  }
}
