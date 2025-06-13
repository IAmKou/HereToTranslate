
export class CreateSubCategoryDto {
  name: string;
  categoryId: number;
}

export class UpdateSubCategoryDto {
  name?: string;
  categoryId?: number;
}
