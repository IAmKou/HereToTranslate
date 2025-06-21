export interface ICreateProjectDto {
  name: string;
  description?: string;
  isPrivate?: boolean;
}

export type IUpdateProjectDto = Partial<Omit<ICreateProjectDto, 'createdBy'>>;
