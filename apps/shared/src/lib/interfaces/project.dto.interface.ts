export interface ICreateProjectDto {
  name: string;
  description?: string;
  isPrivate?: boolean;
  targetLanguages?: string[];
}

export type IUpdateProjectDto = Partial<Omit<ICreateProjectDto, 'createdBy'>>;
