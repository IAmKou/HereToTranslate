import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SubCategoryEntity } from '../db/mysql/entity/subCategory.entity';
import { validateName, sanitizeName } from '../util/validation.util';
import { CreateSubCategoryDto, UpdateSubCategoryDto } from '../db/dto/sub.dto';
import { Category } from '../db/mysql/entity/category.entity';

@Injectable()
export class SubCategoryService {
  constructor(
    @InjectRepository(SubCategoryEntity)
    private readonly subCategoryRepository: Repository<SubCategoryEntity>
  ) {}

  async createSubCategory(CreateSubCategoryDto: CreateSubCategoryDto) {
    if (!CreateSubCategoryDto.name) {
      throw new BadRequestException('SubCategory name is required');
    }

    if (!validateName(CreateSubCategoryDto.name)) {
      throw new BadRequestException('SubCategory name contains invalid characters or is empty after trimming');
    }

    if (!CreateSubCategoryDto.categoryId) {
      throw new BadRequestException('Category reference is required');
    }

    try {
      const newSubCategory = this.subCategoryRepository.create({
        name: sanitizeName(CreateSubCategoryDto.name),
        category: { id: Number(CreateSubCategoryDto.categoryId) } as Category
      });
      return this.subCategoryRepository.save(newSubCategory);
    } catch (error) {
      console.error('Error creating subcategory:', error);
      throw new InternalServerErrorException('Failed to create subcategory');
    }
  }

  async getSubCategories() {
    return this.subCategoryRepository.find({
      relations: ['category']
    });
  }

  async updateSubCategory(id: string, subCategory: Partial<UpdateSubCategoryDto>) {
    if (subCategory.name && !validateName(subCategory.name)) {
      throw new BadRequestException('SubCategory name contains invalid characters or is empty after trimming');
    }

    if (subCategory.name) {
      subCategory.name = sanitizeName(subCategory.name);
    }
    return this.subCategoryRepository.update(id, subCategory);
  }

  async deleteSubCategory(id: string) {
    return this.subCategoryRepository.delete(id);
  }
}
