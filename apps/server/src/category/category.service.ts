import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from '../db/mysql/entity/category.entity';
import { CreateCategoryDto, UpdateCategoryDto } from '../db/dto/category.dto';
import { validateName, sanitizeName } from '../util/validation.util';

@Injectable()
export class CategoryService {
  constructor(
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>
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
}
