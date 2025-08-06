import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    UseGuards,
  } from '@nestjs/common';
  import { WorkflowManagerService } from '#LocalProject/Managers/service/workflow-manager.service';
  import { CreateWorkflowDto, UpdateWorkflowDto } from '#LocalProject/Dtos';
  import { CreateTransitionDto, UpdateTransitionDto } from '#LocalProject/Dtos';
  import { JwtAuthGuard } from '../../auth/guards/jwt.guard';
  
  @Controller('projects/:projectId/workflows')
  @UseGuards(JwtAuthGuard)
  export class WorkflowController {
    constructor(private readonly workflowService: WorkflowManagerService) {}
  
    @Post()
    async createWorkflow(
      @Param('projectId') projectId: string,
      @Body() dto: CreateWorkflowDto,
    ) {
      return await this.workflowService.createWorkflow(projectId, dto);
    }
  
    @Get()
    async getProjectWorkflows(@Param('projectId') projectId: string) {
      return await this.workflowService.getProjectWorkflows(projectId);
    }
  
    @Put(':id')
    async updateWorkflow(@Param('id') id: string, @Body() dto: UpdateWorkflowDto) {
      return await this.workflowService.updateWorkflow(id, dto);
    }
  
    @Delete(':id')
    async deleteWorkflow(@Param('id') id: string) {
      return await this.workflowService.deleteWorkflow(id);
    }
  
    @Post(':id/transitions')
    async createTransition(
      @Param('id') workflowId: string,
      @Body() dto: CreateTransitionDto,
    ) {
      return await this.workflowService.createTransition(workflowId, dto);
    }
  
    @Get(':id/transitions')
    async getWorkflowTransitions(@Param('id') workflowId: string) {
      return await this.workflowService.getWorkflowTransitions(workflowId);
    }
  
    @Put('transitions/:transitionId')
    async updateTransition(
      @Param('transitionId') transitionId: string,
      @Body() dto: UpdateTransitionDto,
    ) {
      return await this.workflowService.updateTransition(transitionId, dto);
    }
  
    @Delete('transitions/:transitionId')
    async deleteTransition(@Param('transitionId') transitionId: string) {
      return await this.workflowService.deleteTransition(transitionId);
    }
  
    @Get(':id/visualization')
    async getWorkflowVisualization(@Param('id') workflowId: string) {
      return await this.workflowService.getWorkflowVisualization(workflowId);
    }
  }