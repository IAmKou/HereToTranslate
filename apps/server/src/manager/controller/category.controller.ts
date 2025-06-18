import { Body, Controller, Delete, Get, Param, Post, Put, ValidationPipe } from "@nestjs/common";
import { CategoryManagerService } from "#LocalProject/Managers/service/category-manager.service";
import { CreateCategoryDto, UpdateCategoryDto } from "#LocalProject/Dtos";
import { BigIntTransformPipe } from "#LocalProject/Utils/pipes/bigint-transform.pipe";

@Controller('categories')
export class CategoryController {
  constructor(private readonly categories: CategoryManagerService) {}

  @Get('all')
  getCategories() {
    return this.categories.getCategories();
  }

  @Post('create')
  createCategory(@Body(ValidationPipe) newCategoryData: CreateCategoryDto) {
    return this.categories.createCategory(newCategoryData);
  }

  @Put(':id/update')
  updateCategory(
    @Param('id', BigIntTransformPipe) categoryId: bigint,
    @Body(ValidationPipe) categoryUpdateData: UpdateCategoryDto
  ) {
    return this.categories.updateCategory(categoryId, categoryUpdateData);
  }

  @Delete(':id/delete')
  deleteCategory(@Param('id', BigIntTransformPipe) categoryId: bigint) {
    return this.categories.deleteCategory(categoryId);
  }
}
