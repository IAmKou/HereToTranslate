import { Body, Controller, Delete, Get, Param, Post, Put } from "@nestjs/common";
import { CategoryService } from "./category.service";
import { CreateCategoryDto, UpdateCategoryDto } from "../db/dto/category.dto";

@Controller('category')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}
//wtf
  @Get('all')
  getCategories() {
    return this.categoryService.getCategories();
  }

  @Post('create')
  createCategory(@Body() category: CreateCategoryDto) {
    return this.categoryService.createCategory(category);
  }

  @Put('update/:id')
  updateCategory(@Param('id') id: string, @Body() category: UpdateCategoryDto) {
    return this.categoryService.updateCategory(id, category);
  }

  @Delete('delete/:id')
  deleteCategory(@Param('id') id: string) {
    return this.categoryService.deleteCategory(id);
  }
}