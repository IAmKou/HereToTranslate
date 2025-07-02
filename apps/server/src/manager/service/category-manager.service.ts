import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateCategoryDto, UpdateCategoryDto } from '#LocalProject/Dtos';
import { validateName, sanitizeName } from '#LocalProject/Utils/validation';
import { CategoryEntity, ProjectTagEntity } from '#LocalProject/Entities';

interface DatabaseError extends Error {
  code?: string;
}

@Injectable()
export class CategoryManagerService {
  constructor(
    @InjectRepository(CategoryEntity)
    private readonly categoryRepository: Repository<CategoryEntity>
  ) {}

  async getCategories() {
    return this.categoryRepository.find();
  }

  async createCategory(data: CreateCategoryDto) {
    if (!data.name) {
      throw new BadRequestException('Category name is required');
    }

    if (!validateName(data.name)) {
      throw new BadRequestException(
        'Category name contains invalid characters or is empty after trimming'
      );
    }

    const sanitizedName = sanitizeName(data.name);
    const existingCategory = await this.categoryRepository.exists({
      where: { name: sanitizedName },
    });
    if (existingCategory) {
      throw new BadRequestException(
        `Category with name "${sanitizedName}" already exists`
      );
    }
    try {
      const newCategory = this.categoryRepository.create({
        name: sanitizeName(data.name),
        description: data.description,
      });
      return this.categoryRepository.save(newCategory);
    } catch (error) {
      const dbError = error as DatabaseError;
      if (dbError.code === 'ER_DUP_ENTRY') {
        throw new BadRequestException(
          'A category with this name already exists'
        );
      }
      console.error('Error creating category:', error);
      throw new InternalServerErrorException('Failed to create category');
    }
  }

  async updateCategory(id: bigint, data: UpdateCategoryDto) {
    if (data.name && !validateName(data.name)) {
      throw new BadRequestException(
        'Category name contains invalid characters or is empty after trimming'
      );
    }

    try {
      const updateData: Partial<CategoryEntity> = {};
      if (data.name) {
        updateData.name = sanitizeName(data.name);
      }
      if (data.description !== undefined) {
        updateData.description = data.description;
      }
      await this.categoryRepository.update({ id }, updateData);
      return this.categoryRepository.findOne({ where: { id } });
    } catch (error) {
      const dbError = error as DatabaseError;
      if (dbError.code === 'ER_DUP_ENTRY') {
        throw new BadRequestException(
          'A category with this name already exists'
        );
      }
      console.error('Error updating category:', error);
      throw new InternalServerErrorException('Failed to update category');
    }
  }

  async deleteCategory(id: bigint) {
    try {
      return this.categoryRepository.delete({ id });
    } catch (error) {
      console.error('Error deleting category:', error);
      throw new InternalServerErrorException('Failed to delete category');
    }
  }
}
