import 'reflect-metadata';
import { FeeService } from '../service/fee-manager.service';

jest.mock('#LocalProject/Entities', () => ({
  SettingsEntity: class SettingsEntityMock {},
}));

jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

describe('FeeService', () => {
  let service: FeeService;
  let mockRepo: any;

  beforeEach(() => {
    mockRepo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };
    service = new FeeService(mockRepo);
  });

  describe('getDefaultFee', () => {
    it('returns default 5.0 when setting not found', async () => {
      mockRepo.findOne.mockResolvedValue(null);

      const fee = await service.getDefaultFee();

      expect(mockRepo.findOne).toHaveBeenCalledWith({ where: { key: 'default_fee_percentage' } });
      expect(fee).toBe(5.0);
    });

    it('returns configured fee when setting exists (number value)', async () => {
      mockRepo.findOne.mockResolvedValue({ key: 'default_fee_percentage', value: 7.5 });

      const fee = await service.getDefaultFee();

      expect(fee).toBe(7.5);
    });

    it('returns configured fee when setting exists (string value)', async () => {
      mockRepo.findOne.mockResolvedValue({ key: 'default_fee_percentage', value: '12.34' });

      const fee = await service.getDefaultFee();

      expect(fee).toBe(12.34);
    });
  });

  describe('setDefaultFee', () => {
    it('throws when percentage < 0', async () => {
      await expect(service.setDefaultFee(-1)).rejects.toThrow('Fee must be between 0 and 100');
    });

    it('throws when percentage > 100', async () => {
      await expect(service.setDefaultFee(101)).rejects.toThrow('Fee must be between 0 and 100');
    });

    it('creates new setting when not existing', async () => {
      mockRepo.findOne.mockResolvedValue(null);
      const created = { key: 'default_fee_percentage', value: 8.5 };
      mockRepo.create.mockReturnValue(created);
      const saved = { id: 1, ...created };
      mockRepo.save.mockResolvedValue(saved);

      const result = await service.setDefaultFee(8.5);

      expect(mockRepo.findOne).toHaveBeenCalledWith({ where: { key: 'default_fee_percentage' } });
      expect(mockRepo.create).toHaveBeenCalledWith({ key: 'default_fee_percentage', value: 8.5 });
      expect(mockRepo.save).toHaveBeenCalledWith(created);
      expect(result).toEqual(saved);
    });

    it('updates existing setting when found', async () => {
      const existing = { id: 2, key: 'default_fee_percentage', value: 5 } as any;
      mockRepo.findOne.mockResolvedValue(existing);
      mockRepo.save.mockImplementation(async (obj: any) => obj);

      const result = await service.setDefaultFee(9.99);

      expect(existing.value).toBe(9.99);
      expect(mockRepo.save).toHaveBeenCalledWith(existing);
      expect(result).toBe(existing);
    });
  });
});


