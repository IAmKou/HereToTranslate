import { Body, Controller, Delete, Get, Param, Post, Put } from "@nestjs/common";
import { CategoryManagerService } from "#LocalProject/Managers/service/category-manager.service";
import { CreateCategoryDto, UpdateCategoryDto } from "#LocalProject/Dtos";

@Controller('category')
export class CategoryController {
  constructor(private readonly categories: CategoryManagerService) {}
//wtf
  @Get('all')
  getCategories() {
    return this.categories.getCategories();
  }

  @Post('create')
  createCategory(@Body() newCategoryData: CreateCategoryDto) {
    return this.categories.createCategory(newCategoryData);
  }

  @Put('update/:id')
  updateCategory(@Param('id') id: string, @Body() categoryUpdateData: UpdateCategoryDto) {
    return this.categories.updateCategory(id, categoryUpdateData);
  }

  @Delete('delete/:id')
  deleteCategory(@Param('id') id: string) {
    return this.categories.deleteCategory(id);
  }
}
