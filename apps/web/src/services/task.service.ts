import axiosInstance from '../api';

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'open' | 'todo' | 'in_progress' | 'done' | 'overdue' | 'closed' | 'cancelled';
  projectId?: string;
  fileId?: string;
  originalText?: string;
  translatedText?: string;
  pages?: number[]; // Array of selected pages for multiple page selection
  language?: string;
  assignedTo?: {
    id: string;
    username: string;
    fullName?: string;
  };
  reviewer?: {
    id: string;
    username: string;
    fullName?: string;
  };
  approver?: {
    id: string;
    username: string;
    fullName?: string;
  };
  createdBy: {
    id: string;
    username: string;
    fullName?: string;
  };
  group?: {
    id: string;
    name: string;
  };
  dueDate?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  commentCount?: number; // Comment count for display
}

// Add new Comment interface
export interface Comment {
  id: string;
  content: string;
  taskId: string;
  author: {
    id: string;
    username: string;
    fullName?: string;
    avatarUrl?: string;
  };
  createdAt: string;
  updatedAt?: string;
}

export interface CreateTaskDto {
  title: string;
  description?: string;
  projectId: string;
  assignedToId?: string;
  reviewerId?: string;
  approverId?: string;
  groupId?: string;
  dueDate?: string;
  dueDateTime?: string;
  fileId?: string;
  pages?: number[]; // Array of selected pages for multiple page selection
  originalText?: string;
  translatedText?: string;
  language?: string;
}

export interface UpdateTaskDto {
  title?: string;
  description?: string;
  // Backend expects statusId for transitions
  statusId?: string;
  // Optional: bypass workflow validation (used immediately after reopen)
  skipWorkflowValidation?: boolean;
  assignedToId?: string;
  reviewerId?: string;
  approverId?: string;
  groupId?: string;
  dueDate?: string;
}

export interface AssignTaskDto {
  taskId: string;
  assignedToId?: string;
  reviewerId?: string;
  approverId?: string;
  reason: string;
  notes?: string;
  dueDate?: string;
}

export interface ReassignTaskDto {
  taskId: string;
  assignedToId?: string;
  reviewerId?: string;
  approverId?: string;
  reason: string;
  notes?: string;
  dueDate?: string;
}

export interface TaskAssignment {
  id: string;
  role: 'translator' | 'reviewer' | 'approver';
  assignedTo: {
    id: string;
    username: string;
    fullName?: string;
  };
  assignedBy: {
    id: string;
    username: string;
    fullName?: string;
  };
  status: 'assigned' | 'reassigned' | 'accepted' | 'declined' | 'completed' | 'cancelled';
  notes?: string;
  dueDate?: string;
  createdAt: string;
}

export interface TaskAssignmentHistory {
  id: string;
  action: 'assigned' | 'reassigned'| 'cancelled';
  role: 'translator' | 'reviewer' | 'approver';
  fromUser?: {
    id: string;
    username: string;
    fullName?: string;
  };
  toUser?: {
    id: string;
    username: string;
    fullName?: string;
  };
  actionBy: {
    id: string;
    username: string;
    fullName?: string;
  };
  reason?: string;
  notes?: string;
  metadata?: {
    previousStatus?: string;
    newStatus?: string;
    pagesAffected?: number[];
    estimatedImpact?: string;
  };
  createdAt: string;
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

export interface FileString {
  id: string;
  originalText: string;
  translatedText: string;
  language: string;
  targetLanguage?: string;
  filePart: number;
  pageNumber: number;
  orderIndex: number;
  position?: any;
  style?: any;
  fontFamily?: string;
  fontSize?: number;
  status: string;
  notes?: string;
  metadata?: any;
  paragraphIndex?: number;
  runIndex?: number;
  createdAt: string;
  updatedAt: string;
}

export interface TaskProgress {
  total: number;
  translated: number;
  percentage: number;
}

export interface TaskHistory {
  id: string;
  taskId: string;
  action: 'status_change' | 'assignment_change' | 'due_date_change' | 'created' | 'closed' | 'reopened';
  description: string;
  performedAt: string;
  reason?: string; // Thêm field reason cho reopen action
  metadata?: {
    fromStatus?: string;
    toStatus?: string;
    fromAssignee?: string;
    toAssignee?: string;
    fromDueDate?: string;
    toDueDate?: string;
  };
}

export const taskService = {
  // Normalize backend task shape to frontend expectations
  _normalizeTask(raw: any): Task {
    if (!raw || typeof raw !== 'object') return raw as Task;
    const task: any = { ...raw };
    // Map backend selectedPages -> pages for consistent UI
    if (Array.isArray(task.selectedPages) && (!Array.isArray(task.pages) || task.pages.length === 0)) {
      task.pages = task.selectedPages;
    }
    // Convert status object to string
    if (task.status && typeof task.status === 'object' && task.status.type) {
      task.status = task.status.type;
    }
    return task as Task;
  },

  async createTask(dto: CreateTaskDto): Promise<Task> {
    const payload: any = { ...dto };
    const { data } = await axiosInstance.post('/tasks', payload);
    return this._normalizeTask(data);
  },

  async getProjectTasks(projectId: string): Promise<Task[]> {
    const { data } = await axiosInstance.get(`/tasks/project/${projectId}`);
    return Array.isArray(data) ? data.map((t: any) => this._normalizeTask(t)) : [];
  },

  async getTask(id: string): Promise<Task> {
    const { data } = await axiosInstance.get(`/tasks/${id}`);
    return this._normalizeTask(data);
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

  async reopenTask(id: string, reason?: string): Promise<Task> {
    const { data } = await axiosInstance.patch(`/tasks/${id}/reopen`, {
      reason
    });
    return data;
  },

  // Task Assignment Methods
  async assignTask(dto: AssignTaskDto): Promise<{ message: string; task: Task }> {
    const { data } = await axiosInstance.post('/task-assignment/assign', dto);
    return data;
  },

  async reassignTask(dto: ReassignTaskDto): Promise<{ message: string; task: Task }> {
    const { data } = await axiosInstance.post('/task-assignment/reassign', dto);
    return data;
  },

  async getTaskAssignments(taskId: string): Promise<{
    task: Task;
    assignments: TaskAssignment[];
    currentAssignments: {
      translator?: { id: string; username: string; fullName?: string };
      reviewer?: { id: string; username: string; fullName?: string };
      approver?: { id: string; username: string; fullName?: string };
    };
  }> {
    const { data } = await axiosInstance.get(`/task-assignment/task/${taskId}`);
    return data;
  },

  async getAssignmentHistory(taskId: string): Promise<TaskAssignmentHistory[]> {
    const { data } = await axiosInstance.get(`/task-assignment/task/${taskId}/history`);
    return data;
  },

  async getProjectParticipants(projectId: string): Promise<Array<{
    id: string;
    username: string;
    fullName?: string;
    email: string;
  }>> {
    const { data } = await axiosInstance.get(`/task-assignment/project/${projectId}/participants`);
    return data;
  },

  async getProjectFiles(projectId: string): Promise<ProjectFile[]> {
    const { data } = await axiosInstance.get(`/files/project/${projectId}`);
    return data;
  },

  async getFileStrings(projectId: string, fileId: string): Promise<FileString[]> {
    const params: any = {
      projectId,
      fileId,
    };

    const { data } = await axiosInstance.get(`/translation/file-strings/${fileId}`, {
      params,
    });

    return data || [];
  },

  async getTaskProgress(taskId: string): Promise<TaskProgress> {
    try {
      const task = await this.getTask(taskId);
      if (!task.fileId || !task.projectId ) {
        return { total: 0, translated: 0, percentage: 0 };
      }

      // Sử dụng ngôn ngữ của task, fallback về 'en' nếu không có
      const taskLanguage = task.language || 'en';

      // Lấy translation strings cho file của task
      const { data } = await axiosInstance.get('/translation/strings', {
        params: {
          projectId: task.projectId,
          fileId: task.fileId,
          language: taskLanguage, // Sử dụng ngôn ngữ của task
        },
      });

      const strings = Array.isArray(data) ? data : [];

      // Lọc strings theo page nếu có
      let filteredStrings = strings;

      // Check for multiple pages first
      if (task.pages && Array.isArray(task.pages) && task.pages.length > 0) {
        filteredStrings = strings.filter((str: any) =>
          task.pages!.includes(str.filePart)
        );
      }
      // Check for single page
      else if (task.pages && task.pages.length > 0) {
        filteredStrings = strings.filter((str: any) => task.pages!.includes(str.filePart));
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

  // Comment-related methods
  async getTaskComments(taskId: string): Promise<Comment[]> {
    const { data } = await axiosInstance.get(`/tasks/${taskId}/comments`);
    return data;
  },

  async addTaskComment(taskId: string, content: string): Promise<Comment> {
    const { data } = await axiosInstance.post(`/tasks/${taskId}/comments`, { content });
    return data;
  },

  async updateTaskComment(commentId: string, content: string): Promise<Comment> {
    console.log('Making API call to update comment:', `/tasks/comments/${commentId}`, { content });
    const { data } = await axiosInstance.patch(`/tasks/comments/${commentId}`, { content });
    console.log('Update comment response:', data);
    return data;
  },

  async deleteTaskComment(commentId: string): Promise<void> {
    await axiosInstance.delete(`/tasks/comments/${commentId}`);
  },
};

