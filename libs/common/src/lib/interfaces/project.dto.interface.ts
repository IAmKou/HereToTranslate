export interface ICreateProjectDto {
  name: string;
  description?: string;
  isPrivate?: boolean;
  targetLanguage?: string;
}

export type IUpdateProjectDto = Partial<Omit<ICreateProjectDto, 'createdBy'>>;
