import axiosInstance from '../api';
import type {
  Workflow,
  WorkflowTransition,
  TaskStatus,
  CreateWorkflowDto,
  UpdateWorkflowDto,
  CreateTransitionDto,
  UpdateTransitionDto,
  CreateStatusDto,
  UpdateStatusDto
} from './task.service';

export interface WorkflowVisualization {
  workflow: Workflow;
  nodes: Array<{
    id: string;
    name: string;
    color: string;
    type: string;
    position: number;
  }>;
  edges: Array<{
    id: string;
    name: string;
    from: string;
    to: string;
    conditionType: string;
  }>;
}

export interface WorkflowInitializationResult {
  message: string;
  statuses: TaskStatus[];
  workflow: Workflow;
  transitions: WorkflowTransition[];
}

export const workflowService = {
  // Status management
  async getProjectStatuses(projectId: string): Promise<TaskStatus[]> {
    const { data } = await axiosInstance.get(`/projects/${projectId}/statuses`);
    return data;
  },

  async createStatus(projectId: string, dto: CreateStatusDto): Promise<TaskStatus> {
    const { data } = await axiosInstance.post(`/projects/${projectId}/statuses`, dto);
    return data;
  },

  async updateStatus(statusId: string, dto: UpdateStatusDto): Promise<TaskStatus> {
    const { data } = await axiosInstance.put(`/statuses/${statusId}`, dto);
    return data;
  },

  async deleteStatus(statusId: string): Promise<{ success: boolean }> {
    const { data } = await axiosInstance.delete(`/statuses/${statusId}`);
    return data;
  },

  async reorderStatuses(projectId: string, statusIds: string[]): Promise<TaskStatus[]> {
    const { data } = await axiosInstance.post(`/projects/${projectId}/statuses/reorder`, { statusIds });
    return data;
  },

  async createDefaultStatuses(projectId: string): Promise<TaskStatus[]> {
    const { data } = await axiosInstance.post(`/projects/${projectId}/statuses/default`);
    return data;
  },

  // Workflow management
  async getProjectWorkflows(projectId: string): Promise<Workflow[]> {
    const { data } = await axiosInstance.get(`/projects/${projectId}/workflows`);
    return data;
  },

  async createWorkflow(projectId: string, dto: CreateWorkflowDto): Promise<Workflow> {
    const { data } = await axiosInstance.post(`/projects/${projectId}/workflows`, dto);
    return data;
  },

  async updateWorkflow(workflowId: string, dto: UpdateWorkflowDto): Promise<Workflow> {
    const { data } = await axiosInstance.put(`/workflows/${workflowId}`, dto);
    return data;
  },

  async deleteWorkflow(workflowId: string): Promise<{ success: boolean }> {
    const { data } = await axiosInstance.delete(`/workflows/${workflowId}`);
    return data;
  },

  // Transition management
  async getWorkflowTransitions(workflowId: string): Promise<WorkflowTransition[]> {
    const { data } = await axiosInstance.get(`/workflows/${workflowId}/transitions`);
    return data;
  },

  async createTransition(workflowId: string, dto: CreateTransitionDto): Promise<WorkflowTransition> {
    const { data } = await axiosInstance.post(`/workflows/${workflowId}/transitions`, dto);
    return data;
  },

  async updateTransition(transitionId: string, dto: UpdateTransitionDto): Promise<WorkflowTransition> {
    const { data } = await axiosInstance.put(`/transitions/${transitionId}`, dto);
    return data;
  },

  async deleteTransition(transitionId: string): Promise<{ success: boolean }> {
    const { data } = await axiosInstance.delete(`/transitions/${transitionId}`);
    return data;
  },

  // Workflow visualization and initialization
  async getWorkflowVisualization(workflowId: string): Promise<WorkflowVisualization> {
    const { data } = await axiosInstance.get(`/workflows/${workflowId}/visualization`);
    return data;
  },

  async initializeProjectWorkflow(projectId: string): Promise<WorkflowInitializationResult> {
    const { data } = await axiosInstance.post(`/projects/${projectId}/workflows/initialize-workflow`);
    return data;
  },

  // Utility methods
  getStatusTypeColor(type: 'todo' | 'in_progress' | 'done'): string {
    const colorMap = {
      'todo': '#42526E',
      'in_progress': '#0052CC',
      'done': '#00875A'
    };
    return colorMap[type];
  },

  getStatusTypeLabel(type: 'todo' | 'in_progress' | 'done'): string {
    const labelMap = {
      'todo': 'To Do',
      'in_progress': 'In Progress',
      'done': 'Done'
    };
    return labelMap[type];
  },

  getPriorityColor(priority: 'lowest' | 'low' | 'medium' | 'high' | 'highest'): string {
    const colorMap = {
      'lowest': '#6b778c',
      'low': '#36b37e',
      'medium': '#ffab00',
      'high': '#ff8b00',
      'highest': '#de350b'
    };
    return colorMap[priority];
  },

  validateWorkflowName(name: string): string | null {
    if (!name || name.trim().length === 0) {
      return 'Workflow name is required';
    }
    if (name.trim().length < 3) {
      return 'Workflow name must be at least 3 characters long';
    }
    if (name.trim().length > 100) {
      return 'Workflow name must be less than 100 characters';
    }
    return null;
  },

  validateStatusName(name: string): string | null {
    if (!name || name.trim().length === 0) {
      return 'Status name is required';
    }
    if (name.trim().length < 2) {
      return 'Status name must be at least 2 characters long';
    }
    if (name.trim().length > 50) {
      return 'Status name must be less than 50 characters';
    }
    return null;
  },

  validateTransitionName(name: string): string | null {
    if (!name || name.trim().length === 0) {
      return 'Transition name is required';
    }
    if (name.trim().length < 3) {
      return 'Transition name must be at least 3 characters long';
    }
    if (name.trim().length > 100) {
      return 'Transition name must be less than 100 characters';
    }
    return null;
  }
};
