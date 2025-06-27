export interface ICreateCategoryDto {
  name: string;
  description?: string;
}

export type IUpdateCategoryDto = Partial<ICreateCategoryDto>;
