import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateCategoryDto, CreateSubCategoryDto, UpdateCategoryDto, UpdateSubCategoryDto } from '#LocalProject/Dtos';
import { validateName, sanitizeName } from '#LocalProject/Utils/validation';
import { CategoryEntity, ProjectTagEntity } from '#LocalProject/Entities';

@Injectable()
export class CategoryManagerService {
  constructor(
    @InjectRepository(CategoryEntity)
    private readonly categoryRepository: Repository<CategoryEntity>,
    @InjectRepository(ProjectTagEntity)
    private readonly subCategoryRepository: Repository<ProjectTagEntity>
  ) {}

  async createCategory(createCategoryDto: CreateCategoryDto) {
    console.log('Received category data:', createCategoryDto);
    if (!createCategoryDto.name) {
      throw new BadRequestException('Category name is required');
    }

    if (!validateName(createCategoryDto.name)) {
      throw new BadRequestException(
        'Category name contains invalid characters or is empty after trimming'
      );
    }

    try {
      const newCategory = this.categoryRepository.create({
        name: sanitizeName(createCategoryDto.name),
        description: createCategoryDto.description,
      });
      return this.categoryRepository.save(newCategory);
    } catch (error) {
      console.error('Error creating category:', error);
      throw new InternalServerErrorException('Failed to create category');
    }
  }

  async getCategories() {
    return this.categoryRepository.find({
      relations: ['subCategories']
    });
  }

  async updateCategory(id: string, category: UpdateCategoryDto) {
    if (category.name && !validateName(category.name)) {
      throw new BadRequestException(
        'Category name contains invalid characters or is empty after trimming'
      );
    }

    if (category.name) {
      category.name = sanitizeName(category.name);
    }
    return this.categoryRepository.update(id, category);
  }

  async deleteCategory(id: string) {
    return this.categoryRepository.delete(id);
  }

  async createSubCategory(data: CreateSubCategoryDto) {
    if (!data.name) {
      throw new BadRequestException('SubCategory name is required');
    }

    if (!validateName(data.name)) {
      throw new BadRequestException('SubCategory name contains invalid characters or is empty after trimming');
    }

    if (!data.categoryId) {
      throw new BadRequestException('Category reference is required');
    }

    try {
      const newSubCategory = this.subCategoryRepository.create({
        name: sanitizeName(data.name),
        category: { id: Number(data.categoryId) } as CategoryEntity
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
