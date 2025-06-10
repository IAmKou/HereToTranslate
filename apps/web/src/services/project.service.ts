import axios from 'axios';

// Configure axios defaults
axios.defaults.baseURL = 'http://localhost:3000';
axios.defaults.headers.common['Content-Type'] = 'application/json';

export interface CreateProjectDto {
  name: string;
  description?: string;
  createdBy: string;
}

export interface Project {
  id: bigint;
  name: string;
  description?: string;
  createdAt: Date;
  createdBy: {
    id: bigint;
    username: string;
  };
}

export class ProjectService {
  private static instance: ProjectService;
  private readonly baseUrl = '/api/projects';

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  private constructor() {}

  public static getInstance(): ProjectService {
    if (!ProjectService.instance) {
      ProjectService.instance = new ProjectService();
    }
    return ProjectService.instance;
  }

  async createProject(project: CreateProjectDto): Promise<Project> {
    try {
      console.log('Sending project data:', project);
      const response = await axios.post<Project>(this.baseUrl, project);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        console.error('Project creation error details:', {
          status: error.response.status,
          data: error.response.data,
          requestData: project
        });
      }
      throw error;
    }
  }

  async getProjects(): Promise<Project[]> {
    const response = await axios.get<Project[]>(this.baseUrl);
    return response.data;
  }
} 