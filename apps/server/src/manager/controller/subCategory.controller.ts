import { Body, Controller, Delete, Get, Param, Post, Put } from "@nestjs/common";
import { CreateSubCategoryDto, UpdateSubCategoryDto } from "#LocalProject/Dtos";
import { CategoryManagerService } from "../service/category-manager.service";

@Controller('subcategory')
export class SubCategoryController {
  constructor(private readonly categories: CategoryManagerService) {}

  @Get('all')
  getSubCategories() {
    return this.categories.getSubCategories();
  }

  @Post('create')
  createSubCategory(@Body() newSubCategory: CreateSubCategoryDto) {
    return this.categories.createSubCategory(newSubCategory);
  }

  @Put('update/:id')
  updateSubCategory(@Param('id') id: string, @Body() updatedSubCategory: UpdateSubCategoryDto) {
    return this.categories.updateSubCategory(id, updatedSubCategory);
  }

  @Delete('delete/:id')
  deleteSubCategory(@Param('id') id: string) {
    return this.categories.deleteSubCategory(id);
  }
}
