import 'reflect-metadata';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { StatusManagerService } from '../service/task-status-manager.service';
import { CreateStatusDto, UpdateStatusDto } from '#LocalProject/Dtos';
import { StatusType } from '#LocalProject/Entities';

// Mock TypeORM decorator to avoid DI issues in direct instantiation
jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

describe('StatusManagerService', () => {
  let service: StatusManagerService;
  let statusRepository: jest.Mocked<Repository<any>>;
  let projectRepository: jest.Mocked<Repository<any>>;

  beforeEach(() => {
    statusRepository = {
      findOneOrFail: jest.fn(),
      findOne: jest.fn(),
      update: jest.fn(),
      createQueryBuilder: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      remove: jest.fn(),
    } as any;

    projectRepository = {
      findOneOrFail: jest.fn(),
    } as any;

    service = new StatusManagerService(statusRepository as any, projectRepository as any);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createStatus', () => {
    it('should create status, unset other defaults and auto-position when position not provided', async () => {
      const project = { id: 1n };
      (projectRepository.findOneOrFail as jest.Mock).mockResolvedValue(project);

      // Query builder for max position
      const qb = {
        select: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getRawOne: jest.fn().mockResolvedValue({ max: 2 }),
      } as any;
      (statusRepository.createQueryBuilder as jest.Mock).mockReturnValue(qb);

      const dto: CreateStatusDto = {
        name: 'Review',
        description: 'Ready for review',
        color: '#123456',
        type: StatusType.IN_PROGRESS,
        isDefault: true,
        // position: undefined
      } as any;

      const createdArg: any = { /* captured later by mock */ };
      (statusRepository.create as jest.Mock).mockImplementation((data: any) => data);
      const saved = { id: 10n, ...dto, position: 3, project };
      (statusRepository.save as jest.Mock).mockResolvedValue(saved);

      const result = await service.createStatus('1', dto);

      expect(projectRepository.findOneOrFail).toHaveBeenCalledWith({ where: { id: 1n } });
      expect(statusRepository.update).toHaveBeenCalledWith({ project: { id: 1n } }, { isDefault: false });
      expect(statusRepository.createQueryBuilder).toHaveBeenCalledWith('status');
      expect(qb.select).toHaveBeenCalledWith('MAX(status.position)', 'max');
      expect(qb.where).toHaveBeenCalledWith('status.projectId = :projectId', { projectId: '1' });
      expect(statusRepository.create).toHaveBeenCalledWith(expect.objectContaining({ position: 3, project }));
      expect(statusRepository.save).toHaveBeenCalled();
      expect(result).toEqual(saved);
    });

    it('should honor provided position and not query for max position when position is provided', async () => {
      const project = { id: 1n };
      (projectRepository.findOneOrFail as jest.Mock).mockResolvedValue(project);

      const dto: CreateStatusDto = {
        name: 'QA',
        color: '#abcdef',
        type: StatusType.TODO,
        isDefault: false,
        position: 10,
      } as any;

      (statusRepository.create as jest.Mock).mockImplementation((data: any) => data);
      const saved = { id: 11n, ...dto, project };
      (statusRepository.save as jest.Mock).mockResolvedValue(saved);

      const result = await service.createStatus('1', dto);

      expect(statusRepository.createQueryBuilder).not.toHaveBeenCalled();
      expect(statusRepository.create).toHaveBeenCalledWith(expect.objectContaining({ position: 10, project }));
      expect(result).toEqual(saved);
    });
  });

  describe('updateStatus', () => {
    it('should unset other defaults if setting a status as default and save updates', async () => {
      const existing = { id: 5n, project: { id: 2n }, name: 'Old', isDefault: false };
      (statusRepository.findOneOrFail as jest.Mock).mockResolvedValue(existing);

      const dto: UpdateStatusDto = { name: 'New Name', isDefault: true } as any;
      (statusRepository.save as jest.Mock).mockImplementation(async (entity: any) => entity);

      const result = await service.updateStatus('5', dto);

      expect(statusRepository.findOneOrFail).toHaveBeenCalledWith({ where: { id: 5n }, relations: ['project'] });
      expect(statusRepository.update).toHaveBeenCalledWith({ project: { id: 2n } }, { isDefault: false });
      expect(statusRepository.save).toHaveBeenCalledWith(expect.objectContaining({ name: 'New Name', isDefault: true }));
      expect(result).toEqual(expect.objectContaining({ name: 'New Name', isDefault: true }));
    });

    it('should save updates without unsetting defaults when isDefault not provided', async () => {
      const existing = { id: 7n, project: { id: 3n }, name: 'Alpha', isDefault: false };
      (statusRepository.findOneOrFail as jest.Mock).mockResolvedValue(existing);

      const dto: UpdateStatusDto = { name: 'Beta' } as any;
      (statusRepository.save as jest.Mock).mockImplementation(async (entity: any) => entity);

      const result = await service.updateStatus('7', dto);

      expect(statusRepository.update).not.toHaveBeenCalled();
      expect(statusRepository.save).toHaveBeenCalledWith(expect.objectContaining({ name: 'Beta' }));
      expect(result).toEqual(expect.objectContaining({ name: 'Beta' }));
    });
  });

  describe('deleteStatus', () => {
    it('should throw NotFoundException when status not found', async () => {
      (statusRepository.findOne as jest.Mock).mockResolvedValue(null);

      await expect(service.deleteStatus('9')).rejects.toThrow(NotFoundException);
      expect(statusRepository.remove).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when status is used by tasks', async () => {
      const existing = { id: 9n, project: { id: 1n } };
      (statusRepository.findOne as jest.Mock).mockResolvedValue(existing);

      const qb = {
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(5),
      } as any;
      (statusRepository.createQueryBuilder as jest.Mock).mockReturnValue(qb);

      await expect(service.deleteStatus('9')).rejects.toThrow(BadRequestException);
      expect(statusRepository.remove).not.toHaveBeenCalled();
    });

    it('should remove status when not used by tasks', async () => {
      const existing = { id: 9n, project: { id: 1n } };
      (statusRepository.findOne as jest.Mock).mockResolvedValue(existing);

      const qb = {
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(0),
      } as any;
      (statusRepository.createQueryBuilder as jest.Mock).mockReturnValue(qb);

      (statusRepository.remove as jest.Mock).mockResolvedValue(undefined);

      const result = await service.deleteStatus('9');

      expect(statusRepository.remove).toHaveBeenCalledWith(existing);
      expect(result).toEqual({ success: true });
    });
  });

  describe('getProjectStatuses', () => {
    it('should return active project statuses ordered by position', async () => {
      const statuses = [
        { id: 1n, position: 0 },
        { id: 2n, position: 1 },
      ];
      (statusRepository.find as jest.Mock).mockResolvedValue(statuses);

      const result = await service.getProjectStatuses('42');

      expect(statusRepository.find).toHaveBeenCalledWith({
        where: { project: { id: 42n }, isActive: true },
        order: { position: 'ASC' },
      });
      expect(result).toBe(statuses);
    });
  });

  describe('reorderStatuses', () => {
    it('should reorder statuses and return the updated list', async () => {
      const projectId = '77';
      const initial = [
        { id: 1n, position: 0 },
        { id: 2n, position: 1 },
        { id: 3n, position: 2 },
      ];
      const finalOrder = [
        { id: 3n, position: 0 },
        { id: 1n, position: 1 },
        { id: 2n, position: 2 },
      ];

      // First call: fetch existing
      (statusRepository.find as jest.Mock).mockResolvedValueOnce(initial);
      // Next call inside getProjectStatuses: return final order
      ;(statusRepository.find as jest.Mock).mockResolvedValueOnce(finalOrder);

      (statusRepository.save as jest.Mock).mockImplementation(async (entity: any) => entity);

      const result = await service.reorderStatuses(projectId, ['3', '1', '2']);

      expect(statusRepository.find).toHaveBeenCalledWith({ where: { project: { id: 77n } } });
      expect(statusRepository.save).toHaveBeenCalledTimes(3);
      expect(statusRepository.save).toHaveBeenCalledWith(expect.objectContaining({ id: 3n, position: 0 }));
      expect(statusRepository.save).toHaveBeenCalledWith(expect.objectContaining({ id: 1n, position: 1 }));
      expect(statusRepository.save).toHaveBeenCalledWith(expect.objectContaining({ id: 2n, position: 2 }));
      expect(result).toEqual(finalOrder);
    });
  });

  describe('createDefaultStatuses', () => {
    it('should create and save default statuses for a project', async () => {
      const project = { id: 5n };
      (projectRepository.findOneOrFail as jest.Mock).mockResolvedValue(project);

      (statusRepository.create as jest.Mock).mockImplementation((data: any) => data);
      (statusRepository.save as jest.Mock)
        .mockResolvedValueOnce({ id: 100n, name: 'To Do', type: StatusType.TODO, position: 0, isDefault: true, project })
        .mockResolvedValueOnce({ id: 101n, name: 'In Progress', type: StatusType.IN_PROGRESS, position: 1, isDefault: false, project })
        .mockResolvedValueOnce({ id: 102n, name: 'Done', type: StatusType.DONE, position: 3, isDefault: false, project });

      const result = await service.createDefaultStatuses('5');

      expect(projectRepository.findOneOrFail).toHaveBeenCalledWith({ where: { id: 5n } });
      expect(statusRepository.create).toHaveBeenCalledTimes(3);
      expect(statusRepository.save).toHaveBeenCalledTimes(3);
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual(expect.objectContaining({ name: 'To Do', type: StatusType.TODO, isDefault: true }));
      expect(result[1]).toEqual(expect.objectContaining({ name: 'In Progress', type: StatusType.IN_PROGRESS }));
      expect(result[2]).toEqual(expect.objectContaining({ name: 'Done', type: StatusType.DONE }));
    });
  });
});
