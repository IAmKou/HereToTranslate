import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards, UseInterceptors } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/guards/jwt.guard';
import { JsonSerializerInterceptor } from '../../util/json-serializer.interceptor';
import { WorkflowManagerService } from '../service/workflow-manager.service';
import { CreateWorkflowDto, UpdateWorkflowDto, CreateTransitionDto, UpdateTransitionDto } from '#LocalProject/Dtos';

@Controller('workflows')
@UseGuards(JwtAuthGuard)
@UseInterceptors(JsonSerializerInterceptor)
export class WorkflowController {
  constructor(private readonly workflowService: WorkflowManagerService) {}

  // Workflows
  @Get('project/:projectId')
  async getProjectWorkflows(@Param('projectId') projectId: string) {
    return this.workflowService.getProjectWorkflows(projectId);
  }

  @Post('project/:projectId')
  async createWorkflow(@Param('projectId') projectId: string, @Body() dto: CreateWorkflowDto) {
    return this.workflowService.createWorkflow(projectId, dto);
  }

  @Put(':id')
  async updateWorkflow(@Param('id') id: string, @Body() dto: UpdateWorkflowDto) {
    return this.workflowService.updateWorkflow(id, dto);
  }

  @Delete(':id')
  async deleteWorkflow(@Param('id') id: string) {
    return this.workflowService.deleteWorkflow(id);
  }

  // Transitions
  @Get(':workflowId/transitions')
  async getWorkflowTransitions(@Param('workflowId') workflowId: string) {
    return this.workflowService.getWorkflowTransitions(workflowId);
  }

  @Post(':workflowId/transitions')
  async createTransition(@Param('workflowId') workflowId: string, @Body() dto: CreateTransitionDto) {
    return this.workflowService.createTransition(workflowId, dto);
  }

  @Put('transitions/:id')
  async updateTransition(@Param('id') id: string, @Body() dto: UpdateTransitionDto) {
    return this.workflowService.updateTransition(id, dto);
  }

  @Delete('transitions/:id')
  async deleteTransition(@Param('id') id: string) {
    return this.workflowService.deleteTransition(id);
  }

  // Visualization
  @Get(':workflowId/visualization')
  async getWorkflowVisualization(@Param('workflowId') workflowId: string) {
    return this.workflowService.getWorkflowVisualization(workflowId);
  }

  @Put(':workflowId/visualization')
  async updateWorkflowVisualization(@Param('workflowId') workflowId: string, @Body() visualizationData: any) {
    return this.workflowService.updateWorkflowVisualization(workflowId, visualizationData);
  }
}
