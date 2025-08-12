import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { CreateCategoryDto, UpdateCategoryDto } from '../../dto';
import { validateName, sanitizeName } from '../../util/validation';

jest.mock('../../util/validation', () => ({
  validateName: jest.fn(),
  sanitizeName: jest.fn(),
}));

jest.mock('#LocalProject/Entities', () => ({
  CategoryEntity: class MockCategoryEntity {},
}));

jest.mock('#LocalProject/Dtos', () => ({
  CreateCategoryDto: class MockCreateCategoryDto {},
  UpdateCategoryDto: class MockUpdateCategoryDto {},
}));

import { CategoryManagerService } from '../service/category-manager.service';

describe('CategoryManagerService', () => {
  let service: CategoryManagerService;
  let mockRepo: {
    find: jest.Mock;
    exists: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
    findOne: jest.Mock;
    delete: jest.Mock;
  };

  beforeEach(() => {
    mockRepo = {
      find: jest.fn(),
      exists: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      findOne: jest.fn(),
      delete: jest.fn(),
    };

    service = new CategoryManagerService(mockRepo as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getCategories', () => {
    it('should return all categories successfully', async () => {
      const expectedCategories = [
        { id: 1n, name: 'Category A', description: 'Description A' },
        { id: 2n, name: 'Category B', description: 'Description B' },
      ];
      mockRepo.find.mockResolvedValue(expectedCategories);

      const result = await service.getCategories();

      expect(mockRepo.find).toHaveBeenCalledWith();
      expect(result).toEqual(expectedCategories);
    });

    it('should return empty array when no categories exist', async () => {
      mockRepo.find.mockResolvedValue([]);

      const result = await service.getCategories();

      expect(mockRepo.find).toHaveBeenCalledWith();
      expect(result).toEqual([]);
    });

    it('should handle database errors gracefully', async () => {
      const dbError = new Error('Database connection failed');
      mockRepo.find.mockRejectedValue(dbError);

      await expect(service.getCategories()).rejects.toThrow('Database connection failed');
      expect(mockRepo.find).toHaveBeenCalledWith();
    });
  });

  describe('createCategory', () => {
    const validDto: CreateCategoryDto = {
      name: 'NewCategory',
      description: 'Sample description',
    };

    it('should create category successfully with valid data', async () => {
      const sanitizedName = 'newcategory';
      const createdCategory = { id: 1n, name: sanitizedName, description: validDto.description };

      (validateName as jest.Mock).mockReturnValue(true);
      (sanitizeName as jest.Mock).mockReturnValue(sanitizedName);
      mockRepo.exists.mockResolvedValue(false);
      mockRepo.create.mockReturnValue(createdCategory);
      mockRepo.save.mockResolvedValue(createdCategory);

      const result = await service.createCategory(validDto);

      expect(validateName).toHaveBeenCalledWith(validDto.name);
      expect(sanitizeName).toHaveBeenCalledWith(validDto.name);
      expect(mockRepo.exists).toHaveBeenCalledWith({
        where: { name: sanitizedName },
      });
      expect(mockRepo.create).toHaveBeenCalledWith({
        name: sanitizedName,
        description: validDto.description,
      });
      expect(mockRepo.save).toHaveBeenCalledWith(createdCategory);
      expect(result).toEqual(createdCategory);
    });

    it('should throw BadRequestException when name is missing', async () => {
      const invalidDto = { name: '', description: 'Test' };

      await expect(service.createCategory(invalidDto)).rejects.toThrow(
        new BadRequestException('Category name is required')
      );
    });

    it('should throw BadRequestException when name is null', async () => {
      const invalidDto = { name: null as any, description: 'Test' };

      await expect(service.createCategory(invalidDto)).rejects.toThrow(
        new BadRequestException('Category name is required')
      );
    });

    it('should throw BadRequestException when name is undefined', async () => {
      const invalidDto = { name: undefined as any, description: 'Test' };

      await expect(service.createCategory(invalidDto)).rejects.toThrow(
        new BadRequestException('Category name is required')
      );
    });

    it('should throw BadRequestException when name contains invalid characters', async () => {
      (validateName as jest.Mock).mockReturnValue(false);

      await expect(service.createCategory(validDto)).rejects.toThrow(
        new BadRequestException('Category name contains invalid characters or is empty after trimming')
      );
    });

    it('should throw BadRequestException when category already exists', async () => {
      const sanitizedName = 'existingcategory';
      (validateName as jest.Mock).mockReturnValue(true);
      (sanitizeName as jest.Mock).mockReturnValue(sanitizedName);
      mockRepo.exists.mockResolvedValue(true);

      await expect(service.createCategory(validDto)).rejects.toThrow(
        new BadRequestException(`Category with name "${sanitizedName}" already exists`)
      );
    });

    it('should throw BadRequestException on ER_DUP_ENTRY database error', async () => {
      const sanitizedName = 'duplicatecategory';
      const dbError = new Error('Duplicate entry') as any;
      dbError.code = 'ER_DUP_ENTRY';

      (validateName as jest.Mock).mockReturnValue(true);
      (sanitizeName as jest.Mock).mockReturnValue(sanitizedName);
      mockRepo.exists.mockResolvedValue(false);
      mockRepo.create.mockReturnValue({});
      mockRepo.save.mockRejectedValue(dbError);

      await expect(service.createCategory(validDto)).rejects.toThrow(
        new InternalServerErrorException('Duplicate entry')
      );
    });

    it('should throw InternalServerErrorException on unknown database error', async () => {
      const sanitizedName = 'newcategory';
      const dbError = new Error('Unknown database error');

      (validateName as jest.Mock).mockReturnValue(true);
      (sanitizeName as jest.Mock).mockReturnValue(sanitizedName);
      mockRepo.exists.mockResolvedValue(false);
      mockRepo.create.mockReturnValue({});
      mockRepo.save.mockRejectedValue(dbError);

      await expect(service.createCategory(validDto)).rejects.toThrow(
        new InternalServerErrorException('Unknown database error')
      );
    });

    it('should create category with undefined description', async () => {
      const dtoWithUndefinedDescription = { name: 'TestCategory', description: undefined };
      const sanitizedName = 'testcategory';
      const createdCategory = { id: 1n, name: sanitizedName, description: undefined };

      (validateName as jest.Mock).mockReturnValue(true);
      (sanitizeName as jest.Mock).mockReturnValue(sanitizedName);
      mockRepo.exists.mockResolvedValue(false);
      mockRepo.create.mockReturnValue(createdCategory);
      mockRepo.save.mockResolvedValue(createdCategory);

      const result = await service.createCategory(dtoWithUndefinedDescription);

      expect(mockRepo.create).toHaveBeenCalledWith({
        name: sanitizedName,
        description: undefined,
      });
      expect(result).toEqual(createdCategory);
    });
  });

  describe('updateCategory', () => {
    const categoryId = 1n;
    const validUpdateDto: UpdateCategoryDto = {
      name: 'UpdatedCategory',
      description: 'Updated description',
    };

    it('should update category successfully with valid data', async () => {
      const sanitizedName = 'updatedcategory';
      const updatedCategory = { id: categoryId, name: sanitizedName, description: validUpdateDto.description };

      (validateName as jest.Mock).mockReturnValue(true);
      (sanitizeName as jest.Mock).mockReturnValue(sanitizedName);
      mockRepo.update.mockResolvedValue({ affected: 1 });
      mockRepo.findOne.mockResolvedValue(updatedCategory);

      const result = await service.updateCategory(categoryId, validUpdateDto);

      expect(validateName).toHaveBeenCalledWith(validUpdateDto.name);
      expect(sanitizeName).toHaveBeenCalledWith(validUpdateDto.name);
      expect(mockRepo.update).toHaveBeenCalledWith(
        { id: categoryId },
        { name: sanitizedName, description: validUpdateDto.description }
      );
      expect(mockRepo.findOne).toHaveBeenCalledWith({ where: { id: categoryId } });
      expect(result).toEqual(updatedCategory);
    });

    it('should update only name when only name is provided', async () => {
      const nameOnlyDto = { name: 'NewName' };
      const sanitizedName = 'newname';
      const updatedCategory = { id: categoryId, name: sanitizedName, description: 'Original description' };

      (validateName as jest.Mock).mockReturnValue(true);
      (sanitizeName as jest.Mock).mockReturnValue(sanitizedName);
      mockRepo.update.mockResolvedValue({ affected: 1 });
      mockRepo.findOne.mockResolvedValue(updatedCategory);

      const result = await service.updateCategory(categoryId, nameOnlyDto);

      expect(mockRepo.update).toHaveBeenCalledWith(
        { id: categoryId },
        { name: sanitizedName }
      );
      expect(result).toEqual(updatedCategory);
    });

    it('should update only description when only description is provided', async () => {
      const descriptionOnlyDto = { description: 'New description' };
      const updatedCategory = { id: categoryId, name: 'Original name', description: 'New description' };

      mockRepo.update.mockResolvedValue({ affected: 1 });
      mockRepo.findOne.mockResolvedValue(updatedCategory);

      const result = await service.updateCategory(categoryId, descriptionOnlyDto);

      expect(validateName).not.toHaveBeenCalled();
      expect(sanitizeName).not.toHaveBeenCalled();
      expect(mockRepo.update).toHaveBeenCalledWith(
        { id: categoryId },
        { description: 'New description' }
      );
      expect(result).toEqual(updatedCategory);
    });

    it('should update description to undefined when description is explicitly set to undefined', async () => {
      const undefinedDescriptionDto = { description: undefined };
      const updatedCategory = { id: categoryId, name: 'Original name', description: undefined };

      mockRepo.update.mockResolvedValue({ affected: 1 });
      mockRepo.findOne.mockResolvedValue(updatedCategory);

      const result = await service.updateCategory(categoryId, undefinedDescriptionDto);

      expect(mockRepo.update).toHaveBeenCalledWith(
        { id: categoryId },
        { description: undefined }
      );
      expect(result).toEqual(updatedCategory);
    });

    it('should throw BadRequestException when name contains invalid characters', async () => {
      (validateName as jest.Mock).mockReturnValue(false);

      await expect(service.updateCategory(categoryId, validUpdateDto)).rejects.toThrow(
        new BadRequestException('Category name contains invalid characters or is empty after trimming')
      );
    });

    it('should throw BadRequestException on ER_DUP_ENTRY database error', async () => {
      const sanitizedName = 'duplicatecategory';
      const dbError = new Error('Duplicate entry') as any;
      dbError.code = 'ER_DUP_ENTRY';

      (validateName as jest.Mock).mockReturnValue(true);
      (sanitizeName as jest.Mock).mockReturnValue(sanitizedName);
      mockRepo.update.mockRejectedValue(dbError);

      await expect(service.updateCategory(categoryId, validUpdateDto)).rejects.toThrow(
        new BadRequestException('A category with this name already exists')
      );
    });

    it('should throw InternalServerErrorException on unknown database error', async () => {
      const sanitizedName = 'updatedcategory';
      const dbError = new Error('Unknown database error');

      (validateName as jest.Mock).mockReturnValue(true);
      (sanitizeName as jest.Mock).mockReturnValue(sanitizedName);
      mockRepo.update.mockRejectedValue(dbError);

      await expect(service.updateCategory(categoryId, validUpdateDto)).rejects.toThrow(
        new InternalServerErrorException('Failed to update category')
      );
    });

    it('should handle empty update data gracefully', async () => {
      const emptyDto = {};
      const originalCategory = { id: categoryId, name: 'Original name', description: 'Original description' };

      mockRepo.update.mockResolvedValue({ affected: 1 });
      mockRepo.findOne.mockResolvedValue(originalCategory);

      const result = await service.updateCategory(categoryId, emptyDto);

      expect(mockRepo.update).toHaveBeenCalledWith({ id: categoryId }, {});
      expect(result).toEqual(originalCategory);
    });
  });

  describe('deleteCategory', () => {
    const categoryId = 1n;

    it('should delete category successfully', async () => {
      const deleteResult = { affected: 1 };
      mockRepo.delete.mockResolvedValue(deleteResult);

      const result = await service.deleteCategory(categoryId);

      expect(mockRepo.delete).toHaveBeenCalledWith({ id: categoryId });
      expect(result).toEqual(deleteResult);
    });

    it('should handle deletion of non-existent category', async () => {
      const deleteResult = { affected: 0 };
      mockRepo.delete.mockResolvedValue(deleteResult);

      const result = await service.deleteCategory(categoryId);

      expect(mockRepo.delete).toHaveBeenCalledWith({ id: categoryId });
      expect(result).toEqual(deleteResult);
    });

    it('should throw InternalServerErrorException on database error', async () => {
      const dbError = new Error('Database connection failed');
      mockRepo.delete.mockRejectedValue(dbError);

      await expect(service.deleteCategory(categoryId)).rejects.toThrow(
        new InternalServerErrorException('Database connection failed')
      );
      expect(mockRepo.delete).toHaveBeenCalledWith({ id: categoryId });
    });

    it('should handle foreign key constraint errors', async () => {
      const fkError = new Error('Cannot delete or update a parent row: a foreign key constraint fails');
      mockRepo.delete.mockRejectedValue(fkError);

      await expect(service.deleteCategory(categoryId)).rejects.toThrow(
        new InternalServerErrorException('Cannot delete or update a parent row: a foreign key constraint fails')
      );
      expect(mockRepo.delete).toHaveBeenCalledWith({ id: categoryId });
    });
  });
});
