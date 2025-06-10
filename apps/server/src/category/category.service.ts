import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from '../db/mysql/entity/category.entity';
import { CreateCategoryDto, UpdateCategoryDto } from '../db/dto/category.dto';

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
    try {
      const newCategory = this.categoryRepository.create({
        name: createCategoryDto.name,
        description: createCategoryDto.description
    });
      return this.categoryRepository.save(newCategory);
    } catch (error) {
      console.error('Error creating category:', error);
      throw new InternalServerErrorException('Failed to create category');
    }
  }

  async getCategories() {
    return this.categoryRepository.find();
  }

  async updateCategory(id: string, category: UpdateCategoryDto) {
    return this.categoryRepository.update(id, category);
  }
//wtf
  async deleteCategory(id: string) {
    return this.categoryRepository.delete(id);
  }
}


