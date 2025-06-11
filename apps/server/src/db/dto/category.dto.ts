export class CreateCategoryDto {
    name: string;
    description?: string;
    projectId?: number;
  }
  
  export class UpdateCategoryDto {
    name?: string;
    description?: string;
    projectId?: number;
  }