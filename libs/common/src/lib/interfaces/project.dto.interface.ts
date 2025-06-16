export interface ICreateProjectDto {
  name: string;
  description?: string;
  isPublic?: boolean;
  createdBy: string;
}

export type IUpdateProjectDto = Partial<Omit<ICreateProjectDto, 'createdBy'>>;
