export interface ICreateProjectDto {
  name: string;
  description?: string;
  isPublic?: boolean;
}

export type IUpdateProjectDto = Partial<Omit<ICreateProjectDto, 'createdBy'>>;
