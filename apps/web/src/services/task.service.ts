import axiosInstance from '../api';

export interface TaskStatus {
  id: string;
  name: string;
  description?: string;
  color: string;
  type: 'todo' | 'in_progress' | 'done';
  position: number;
  isDefault: boolean;
  isActive: boolean;
}

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  isDefault: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowTransition {
  id: string;
  name: string;
  fromStatus: TaskStatus;
  toStatus: TaskStatus;
  conditionType: 'anyone' | 'assignee_only' | 'role_based' | 'custom';
  conditionData?: Record<string, unknown>;
  isActive: boolean;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: string; // Now references TaskStatus.id
  statusDetails?: TaskStatus; // Full status object when populated
  workflowId?: string;
  workflow?: Workflow;
  projectId?: string;
  branchId?: string;
  fileId?: string;
  filePart?: number;
  language?: string;
  priority?: 'lowest' | 'low' | 'medium' | 'high' | 'highest';
  storyPoints?: number;
  customFields?: Record<string, unknown>;
  assignedTo?: {
    id: string;
    username: string;
    fullName?: string;
    avatarUrl?: string;
  };
  createdBy: {
    id: string;
    username: string;
    fullName?: string;
    avatarUrl?: string;
  };
  group?: {
    id: string;
    name: string;
  };
  dueDate?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  updatedAt: string;
}

export interface CreateTaskDto {
  title: string;
  description?: string;
  projectId: string;
  assignedToId?: string;
  groupId?: string;
  dueDate?: string;
  dueDateTime?: string;
  branchId?: string;
  fileId?: string;
  filePart?: number;
  language?: string;
  workflowId?: string;
  statusId?: string;
  priority?: 'lowest' | 'low' | 'medium' | 'high' | 'highest';
  storyPoints?: number;
  customFields?: Record<string, unknown>;
}

export interface UpdateTaskDto {
  title?: string;
  description?: string;
  statusId?: string;
  assignedToId?: string;
  groupId?: string;
  dueDate?: string;
  priority?: 'lowest' | 'low' | 'medium' | 'high' | 'highest';
  storyPoints?: number;
  customFields?: Record<string, unknown>;
}

export interface TransitionTaskDto {
  toStatusId: string;
  comment?: string;
}

export interface CreateStatusDto {
  name: string;
  description?: string;
  color: string;
  type: 'todo' | 'in_progress' | 'done';
  position?: number;
  isDefault?: boolean;
}

export interface UpdateStatusDto {
  name?: string;
  description?: string;
  color?: string;
  type?: 'todo' | 'in_progress' | 'done';
  position?: number;
  isDefault?: boolean;
  isActive?: boolean;
}

export interface CreateWorkflowDto {
  name: string;
  description?: string;
  isDefault?: boolean;
}

export interface UpdateWorkflowDto {
  name?: string;
  description?: string;
  isDefault?: boolean;
  isActive?: boolean;
}

export interface CreateTransitionDto {
  name: string;
  fromStatusId: string;
  toStatusId: string;
  conditionType?: 'anyone' | 'assignee_only' | 'role_based' | 'custom';
  conditionData?: Record<string, unknown>;
}

export interface UpdateTransitionDto {
  name?: string;
  fromStatusId?: string;
  toStatusId?: string;
  conditionType?: 'anyone' | 'assignee_only' | 'role_based' | 'custom';
  conditionData?: Record<string, unknown>;
  isActive?: boolean;
}

export interface ProjectFile {
  fileId: string;
  fileName: string;
  fileType: string;
  status: 'processing' | 'ready' | 'error';
  uploader: {
    uploaderId: string;
    username: string;
    fullName?: string;
  };
}

export interface FilePart {
  part: number;
  stringCount: number;
  totalParts: number;
  pageNumber?: number; // Số trang (hiển thị từ 1)
  hasTranslatedStrings?: boolean; // Có strings đã dịch chưa
}

export interface TaskProgress {
  total: number;
  translated: number;
  percentage: number;
}

export interface TaskHistory {
  id: string;
  // When returned from server, these fields are present for status history entries
  createdAt: string; // timestamp of the history entry
  comment?: string; // optional comment provided during transition
  fromStatus?: {
    id: string;
    name: string;
    color: string;
  };
  toStatus?: {
    id: string;
    name: string;
    color: string;
  };
  changedBy?: {
    id: string;
    username: string;
    fullName?: string;
    avatarUrl?: string;
  };
}


export const taskService = {
  async createTask(dto: CreateTaskDto): Promise<Task> {
    const { data } = await axiosInstance.post('/tasks', dto);
    return data;
  },

  async getProjectTasks(projectId: string): Promise<Task[]> {
    const { data } = await axiosInstance.get(`/tasks/project/${projectId}`);
    return data;
  },

  async getTask(id: string): Promise<Task> {
    const { data } = await axiosInstance.get(`/tasks/${id}`);
    return data;
  },

  async updateTask(id: string, dto: UpdateTaskDto): Promise<Task> {
    const { data } = await axiosInstance.patch(`/tasks/${id}`, dto);
    return data;
  },

  async deleteTask(id: string): Promise<{ success: boolean }> {
    const { data } = await axiosInstance.delete(`/tasks/${id}`);
    return data;
  },

  async getUserTasks(userId: string): Promise<Task[]> {
    const { data } = await axiosInstance.get(`/tasks/user/${userId}`);
    return data;
  },

  async closeTask(id: string): Promise<Task> {
    const { data } = await axiosInstance.patch(`/tasks/${id}/close`);
    return data;
  },

  async reopenTask(id: string): Promise<Task> {
    const { data } = await axiosInstance.patch(`/tasks/${id}/reopen`);
    return data;
  },

  async getProjectFiles(projectId: string): Promise<ProjectFile[]> {
    const { data } = await axiosInstance.get(`/files/project/${projectId}`);
    return data;
  },

  async getFileParts(projectId: string, branchId: string, fileId: string): Promise<FilePart[]> {
    try {
      // Sử dụng API mới để lấy thông tin trang
      const { data } = await axiosInstance.get(`/translation/file-pages/${fileId}`, {
        params: {
          projectId,
          branchId,
        },
      });

      if (!data || !data.pages) {
        return [];
      }

      // Chuyển đổi thông tin trang thành FilePart
      const parts: FilePart[] = data.pages.map((page: any) => ({
        part: page.filePart,
        stringCount: page.stringCount,
        totalParts: data.totalPages,
        pageNumber: page.pageNumber,
        hasTranslatedStrings: page.hasTranslatedStrings,
      }));

      return parts;
    } catch (error) {
      console.error('Error getting file pages:', error);
      // Fallback về logic cũ nếu API mới không hoạt động
      const { data } = await axiosInstance.get('/translation/strings', {
        params: {
          projectId,
          branchId,
          fileId,
          language: 'en',
        },
      });

      const fileStrings = data || [];
      const filteredStrings = fileStrings.filter((str: any) => str.fileId === fileId);

      if (filteredStrings.length === 0) {
        return [];
      }

      const stringsByPart = new Map<number, any[]>();

      for (const str of filteredStrings) {
        const part = str.filePart || 0;
        if (!stringsByPart.has(part)) {
          stringsByPart.set(part, []);
        }
        stringsByPart.get(part)!.push(str);
      }

      const sortedParts = Array.from(stringsByPart.keys()).sort((a, b) => a - b);
      const parts: FilePart[] = [];

      for (const part of sortedParts) {
        const strings = stringsByPart.get(part)!;
        parts.push({
          part,
          stringCount: strings.length,
          totalParts: sortedParts.length,
          pageNumber: part + 1, // Giả định mỗi part là một trang
        });
      }

      return parts;
    }
  },

  async getTaskProgress(taskId: string): Promise<TaskProgress> {
    try {
      const task = await this.getTask(taskId);
      if (!task.fileId || !task.projectId || !task.branchId) {
        return { total: 0, translated: 0, percentage: 0 };
      }

      // Sử dụng ngôn ngữ của task, fallback về 'en' nếu không có
      const taskLanguage = task.language || 'en';

      // Lấy translation strings cho file của task
      const { data } = await axiosInstance.get('/translation/strings', {
        params: {
          projectId: task.projectId,
          branchId: task.branchId,
          fileId: task.fileId,
          language: taskLanguage, // Sử dụng ngôn ngữ của task
        },
      });

      const strings = Array.isArray(data) ? data : [];

      // Lọc strings theo filePart nếu có
      let filteredStrings = strings;
      if (task.filePart !== undefined) {
        filteredStrings = strings.filter((str: any) => str.filePart === task.filePart);
      }

      const total = filteredStrings.length;
      const translated = filteredStrings.filter((str: any) =>
        str.translatedText && str.translatedText.trim().length > 0
      ).length;

      const percentage = total > 0 ? Math.round((translated / total) * 100) : 0;

      return { total, translated, percentage };
    } catch (error) {
      console.error('Error getting task progress:', error);
      return { total: 0, translated: 0, percentage: 0 };
    }
  },

  async getTaskHistory(taskId: string): Promise<TaskHistory[]> {
    const { data } = await axiosInstance.get(`/tasks/${taskId}/history`);
    return data;
  },

  // Task transition methods
  async transitionTask(taskId: string, dto: TransitionTaskDto): Promise<Task> {
    const { data } = await axiosInstance.post(`/tasks/${taskId}/transition`, dto);
    return data;
  },

  async getAvailableTransitions(taskId: string): Promise<WorkflowTransition[]> {
    const { data } = await axiosInstance.get(`/tasks/${taskId}/available-transitions`);
    return data;
  },

  // Status management methods
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

  // Workflow management methods
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

  async getWorkflowVisualization(workflowId: string): Promise<{
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
  }> {
    const { data } = await axiosInstance.get(`/workflows/${workflowId}/visualization`);
    return data;
  },

  async initializeProjectWorkflow(projectId: string): Promise<{
    message: string;
    statuses: TaskStatus[];
    workflow: Workflow;
    transitions: WorkflowTransition[];
  }> {
    const { data } = await axiosInstance.post(`/projects/${projectId}/workflows/initialize-workflow`);
    return data;
  },
};
