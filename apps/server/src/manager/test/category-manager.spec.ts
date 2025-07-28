import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { CreateCategoryDto } from '../../dto';
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
  };

  beforeEach(() => {
    mockRepo = {
      find: jest.fn(),
      exists: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    service = new CategoryManagerService(mockRepo as any); // no DI container
  });

  describe('getCategories', () => {
    it('should return all categories', async () => {
      const expected = [{ id: 1, name: 'A' }];
      mockRepo.find.mockResolvedValue(expected);

      const result = await service.getCategories();
      expect(result).toEqual(expected);
    });
  });

  describe('createCategory', () => {
    const dto: CreateCategoryDto = {
      name: 'NewCategory',
      description: 'Sample',
    };

    it('should throw if name is missing', async () => {
      await expect(service.createCategory({ name: '', description: '' }))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw if name is invalid', async () => {
      (validateName as jest.Mock).mockReturnValue(false);

      await expect(service.createCategory(dto)).rejects.toThrow(
        /invalid characters/
      );
    });

    it('should throw if category already exists', async () => {
      (validateName as jest.Mock).mockReturnValue(true);
      (sanitizeName as jest.Mock).mockReturnValue('NewCategory');
      mockRepo.exists.mockResolvedValue(true);

      await expect(service.createCategory(dto)).rejects.toThrow(
        /already exists/
      );
    });

    it('should create and save new category', async () => {
      const sanitized = 'newcategory';
      const created = { id: 1, name: sanitized };
      (validateName as jest.Mock).mockReturnValue(true);
      (sanitizeName as jest.Mock).mockReturnValue(sanitized);
      mockRepo.exists.mockResolvedValue(false);
      mockRepo.create.mockReturnValue(created);
      mockRepo.save.mockResolvedValue(created);

      const result = await service.createCategory(dto);

      expect(mockRepo.create).toHaveBeenCalledWith({
        name: sanitized,
        description: dto.description,
      });
      expect(mockRepo.save).toHaveBeenCalledWith(created);
      expect(result).toEqual(created);
    });

    it('should throw InternalServerErrorException on unknown DB error', async () => {
      (validateName as jest.Mock).mockReturnValue(true);
      (sanitizeName as jest.Mock).mockReturnValue('new');
      mockRepo.exists.mockResolvedValue(false);
      mockRepo.create.mockReturnValue({});
      mockRepo.save.mockRejectedValue(new Error('Unexpected'));

      await expect(service.createCategory(dto)).rejects.toThrow(InternalServerErrorException);
    });

    it('should throw BadRequestException on ER_DUP_ENTRY error', async () => {
      (validateName as jest.Mock).mockReturnValue(true);
      (sanitizeName as jest.Mock).mockReturnValue('dup');
      mockRepo.exists.mockResolvedValue(false);
      mockRepo.create.mockReturnValue({});
      const dbErr = new Error('Duplicate') as any;
      dbErr.code = 'ER_DUP_ENTRY';
      mockRepo.save.mockRejectedValue(dbErr);

      await expect(service.createCategory(dto)).rejects.toThrow(BadRequestException);
    });
  });
});
