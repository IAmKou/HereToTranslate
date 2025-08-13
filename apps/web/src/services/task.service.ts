import axiosInstance from '../api';

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'closed' | 'cancelled';
  projectId?: string;
  branchId?: string;
  fileId?: string;
  page?: number;
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
  branchId?: string;
  fileId?: string;
  page?: number;
  pages?: number[]; // Array of selected pages for multiple page selection
  language?: string;
}

export interface UpdateTaskDto {
  title?: string;
  description?: string;
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
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
        part: page.pageNumber || page.filePart, // Sử dụng pageNumber nếu có, fallback về filePart
        stringCount: page.stringCount,
        totalParts: data.totalPages,
        pageNumber: page.pageNumber || page.filePart,
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

      // Lọc strings theo page nếu có
      let filteredStrings = strings;

      // Check for multiple pages first
      if (task.pages && Array.isArray(task.pages) && task.pages.length > 0) {
        filteredStrings = strings.filter((str: any) =>
          task.pages!.includes(str.filePart)
        );
      }
      // Check for single page
      else if (task.page !== undefined) {
        filteredStrings = strings.filter((str: any) => str.filePart === task.page);
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
};

