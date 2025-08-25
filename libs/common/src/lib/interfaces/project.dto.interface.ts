export interface ICreateProjectDto {
  name: string;
  description?: string;
  isPrivate?: boolean;
  targetLanguages?: string[];
}

export type IUpdateProjectDto = Partial<Omit<ICreateProjectDto, 'createdBy'>>;

export interface IProjectResponse {
  id: string;
  name: string;
  description?: string;
  isPrivate: boolean;
  isSyncedFromRequest?: boolean;
  createdAt: string;
  targetLanguages?: string[];
  createdBy: {
    id: string;
    username: string;
    fullName?: string;
    avatarUrl?: string;
  };
  tags?: Array<{ id: string; name: string }>;
  projectRoles?: Array<{ id: string; name: string; permissionFlags: string }>;
}
