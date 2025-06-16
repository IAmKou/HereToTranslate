import { Body, Controller, Delete, Get, Param, Post, Put } from "@nestjs/common";
import { CategoryManagerService } from "#LocalProject/Managers/service/category-manager.service";
import { CreateCategoryDto, UpdateCategoryDto } from "#LocalProject/Dtos";

@Controller('categories')
export class CategoryController {
  constructor(private readonly categories: CategoryManagerService) {}

  @Get('all')
  getCategories() {
    return this.categories.getCategories();
  }

  @Post('create')
  createCategory(@Body() newCategoryData: CreateCategoryDto) {
    return this.categories.createCategory(newCategoryData);
  }

  @Put(':id/update')
  updateCategory(@Param('id') id: string, @Body() categoryUpdateData: UpdateCategoryDto) {
    return this.categories.updateCategory(id, categoryUpdateData);
  }

  @Delete(':id/delete')
  deleteCategory(@Param('id') id: string) {
    return this.categories.deleteCategory(id);
  }
}
