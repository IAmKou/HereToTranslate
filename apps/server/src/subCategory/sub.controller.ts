import { Body, Controller, Delete, Get, Param, Post, Put } from "@nestjs/common";
import { SubCategoryService } from "./sub.service";
import { CreateSubCategoryDto, UpdateSubCategoryDto } from "#LocalProject/Dtos";

@Controller('subcategory')
export class SubCategoryController {
  constructor(private readonly subCategoryService: SubCategoryService) {}

  @Get('all')
  getSubCategories() {
    return this.subCategoryService.getSubCategories();
  }

  @Post('create')
  createSubCategory(@Body() subCategory: CreateSubCategoryDto) {
    return this.subCategoryService.createSubCategory(subCategory);
  }

  @Put('update/:id')
  updateSubCategory(@Param('id') id: string, @Body() subCategory: UpdateSubCategoryDto) {
    return this.subCategoryService.updateSubCategory(id, subCategory);
  }

  @Delete('delete/:id')
  deleteSubCategory(@Param('id') id: string) {
    return this.subCategoryService.deleteSubCategory(id);
  }
}
