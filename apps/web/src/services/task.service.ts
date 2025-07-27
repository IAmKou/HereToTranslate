import axiosInstance from '../api';

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'closed' | 'cancelled';
  projectId?: string;
  branchId?: string;
  fileId?: string;
  filePart?: number;
  assignedTo?: {
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
  groupId?: string;
  dueDate?: string;
  branchId?: string;
  fileId?: string;
  filePart?: number;
}

export interface UpdateTaskDto {
  title?: string;
  description?: string;
  status?: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  assignedToId?: string;
  groupId?: string;
  dueDate?: string;
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
}

export interface TaskProgress {
  total: number;
  translated: number;
  percentage: number;
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
    const { data } = await axiosInstance.get('/translation/strings', {
      params: {
        projectId,
        branchId,
        fileId,
      },
    });

    // Sử dụng cùng logic chia parts như trong ProjectTranslationTab
    const PART_SIZE = 250;
    const strings = data || [];

    // Lọc strings cho file cụ thể
    const fileStrings = strings.filter((str: any) => str.fileId === fileId);

    if (fileStrings.length === 0) {
      return [];
    }

    const totalParts = Math.ceil(fileStrings.length / PART_SIZE);
    const parts: FilePart[] = [];

    for (let part = 0; part < totalParts; part++) {
      const start = part * PART_SIZE;
      const stringCount = Math.min(PART_SIZE, fileStrings.length - start);

      parts.push({
        part,
        stringCount,
        totalParts,
      });
    }

    return parts;
  },

  async getTaskProgress(taskId: string): Promise<TaskProgress> {
    try {
      const task = await this.getTask(taskId);
      if (!task.fileId || !task.projectId || !task.branchId) {
        return { total: 0, translated: 0, percentage: 0 };
      }

      // Lấy translation strings cho file của task
      const { data } = await axiosInstance.get('/translation/strings', {
        params: {
          projectId: task.projectId,
          branchId: task.branchId,
          fileId: task.fileId,
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
  }
};
