import 'reflect-metadata';
import { BadRequestException, NotFoundException, InternalServerErrorException } from '@nestjs/common';
let RequestManagerService: any;
import { RequestStatus, TransactionStatus, WalletEntity } from '#LocalProject/Entities';
import { In } from 'typeorm';
import { Express } from 'express';

// Mock all dependencies
jest.mock('@nestjs/typeorm', () => ({
  InjectRepository: () => () => undefined,
}));

jest.mock(require.resolve('../service/wallet-manager.service'), () => ({
  WalletManagerService: jest.fn().mockImplementation(() => ({
    getOrCreateWallet: jest.fn(),
  })),
}));
jest.mock(require.resolve('../../mailer/mailer.service'), () => ({
  MailService: jest.fn().mockImplementation(() => ({
    sendPrivateRequestConfirmation: jest.fn(),
    notifyRequesterOfRegistration: jest.fn(),
  })),
}));
jest.mock('../../chat/chat.service', () => ({
  ChatService: jest.fn().mockImplementation(() => ({
    openChatBetween: jest.fn(),
  })),
}));
jest.mock(require.resolve('../service/payment-manager.service'), () => ({
  PaypalService: jest.fn().mockImplementation(() => ({
    createPrivateDeposit: jest.fn(),
    createDeposit: jest.fn(),
  })),
}));
jest.mock(require.resolve('../service/file-manager.service'), () => ({
  FileService: jest.fn().mockImplementation(() => ({
    handleLocalUpload: jest.fn(),
    saveFile: jest.fn(),
  })),
}));
jest.mock(require.resolve('../service/project-manager.service'), () => ({
  ProjectManagerService: jest.fn().mockImplementation(() => ({
    createProjectFromRequest: jest.fn(),
    dataSource: {
      createQueryRunner: jest.fn(() => ({
        connect: jest.fn(),
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        rollbackTransaction: jest.fn(),
        release: jest.fn(),
        manager: { save: jest.fn() },
      })),
    },
  })),
}));
jest.mock(require.resolve('../service/notification-manager.service'), () => ({
  NotificationManagerService: jest.fn().mockImplementation(() => ({
    createGlobalNotification: jest.fn(),
    createNotification: jest.fn(),
  })),
}));

describe('RequestManagerService', () => {
  let service: any;
  let mockRequestRepository: any;
  let mockUserRepository: any;
  let mockCategoryRepository: any;
  let mockProjectTagRepository: any;
  let mockTransactionRepository: any;
  let mockWalletRepository: any;
  let mockFileRepository: any;
  let mockProjectRepository: any;
  let mockWalletService: any;
  let mockMailService: any;
  let mockChatService: any;
  let mockPaymentService: any;
  let mockFileService: any;
  let mockProjectService: any;
  let mockNotificationService: any;

  const mockUser = {
    id: 1n,
    username: 'testuser',
    fullName: 'Test User',
    email: 'test@example.com',
    phone: '+1234567890',
    isActive: true,
  };

  const mockCategory = {
    id: 1n,
    name: 'Test Category',
  };

  const mockProjectTag = {
    id: 1n,
    name: 'test-tag',
  };

  const mockFile = {
    id: 1n,
    fileName: 'test.txt',
    fileType: 'text/plain',
    fileContent: Buffer.from('test content'),
  };

           const mockRequest = {
           id: 1n,
           title: 'Test Request',
           description: 'Test Description',
           dealAmount: 100,
           deadline: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(), 
           status: RequestStatus.Pending,
           isPublic: true,
           createdAt: new Date(),
           requester: mockUser,
           project: null,
           assignee: null,
           category: mockCategory,
           tags: [mockProjectTag],
           files: [mockFile],
           registrants: [],
         };

           const mockExpressFile: Express.Multer.File = {
           fieldname: 'file',
           originalname: 'test.txt',
           encoding: '7bit',
           mimetype: 'text/plain',
           size: 1024,
           destination: '/tmp',
           filename: 'test.txt',
           path: '/tmp/test.txt',
           buffer: Buffer.from('test content'),
         };

           const mockCreateRequestDto = {
           title: 'Test Request',
           description: 'Test Description',
           dealAmount: 100,
           deadline: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(),
           projectId: '1',
           assigneeId: '2',
           categoryId: '1',
           tags: ['test-tag'],
           isPublic: true,
         };

  beforeEach(() => {
    // Load the service after mocks are in place to avoid evaluating real dependencies
    const mod = require('../service/request-manager.service');
    RequestManagerService = mod.RequestManagerService;
    // Create mock repositories
    mockRequestRepository = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      findOneOrFail: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    const requestQB = {
      select: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
      getOne: jest.fn(),
      whereInIds: jest.fn().mockReturnThis(),
    } as any;
    mockRequestRepository.createQueryBuilder.mockReturnValue(requestQB);

    mockUserRepository = {
      findOne: jest.fn(),
      findOneOrFail: jest.fn(),
      createQueryBuilder: jest.fn(),
    };
    const userQB = {
      select: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      whereInIds: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
    } as any;
    mockUserRepository.createQueryBuilder.mockReturnValue(userQB);

    mockCategoryRepository = {
      findOne: jest.fn(),
    };

    mockProjectTagRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    mockTransactionRepository = {
      findOne: jest.fn(),
      save: jest.fn(),
    };

    mockWalletRepository = {
      save: jest.fn(),
    };

    mockFileRepository = {
      findOneOrFail: jest.fn(),
    };

    mockProjectRepository = {
      findOneOrFail: jest.fn(),
    };

    // Create mock services
    mockWalletService = {
      getOrCreateWallet: jest.fn(),
    };

    mockMailService = {
      sendPrivateRequestConfirmation: jest.fn(),
      notifyRequesterOfRegistration: jest.fn(),
    };

    mockChatService = {
      openChatBetween: jest.fn(),
    };

    mockPaymentService = {
      createPrivateDeposit: jest.fn(),
      createDeposit: jest.fn(),
    };

    mockFileService = {
      handleLocalUpload: jest.fn(),
      saveFile: jest.fn(),
    };

    mockProjectService = {
      createProjectFromRequest: jest.fn(),
      dataSource: {
        createQueryRunner: jest.fn(() => ({
          connect: jest.fn(),
          startTransaction: jest.fn(),
          commitTransaction: jest.fn(),
          rollbackTransaction: jest.fn(),
          release: jest.fn(),
          manager: {
            save: jest.fn(),
          },
        })),
      },
    };

    mockNotificationService = {
      createGlobalNotification: jest.fn(),
      createNotification: jest.fn(),
    };

    // Create service instance with mocked dependencies
    service = new RequestManagerService(
      mockRequestRepository as any,
      mockUserRepository as any,
      mockCategoryRepository as any,
      mockProjectTagRepository as any,
      mockTransactionRepository as any,
      mockWalletRepository as any,
      mockFileRepository as any,
      mockProjectRepository as any,
      mockWalletService as any,
      mockMailService as any,
      mockChatService as any,
      mockPaymentService as any,
      mockFileService as any,
      mockProjectService as any,
      mockNotificationService as any,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createRequest', () => {
    it('should create public request successfully', async () => {
      const createdRequest = { ...mockRequest };
      const savedRequest = { ...mockRequest, id: 1n };

      mockFileService.handleLocalUpload.mockResolvedValue({ fileId: '1' });
      mockFileRepository.findOneOrFail.mockResolvedValue(mockFile);
      mockRequestRepository.create.mockReturnValue(createdRequest);
      mockRequestRepository.save.mockResolvedValue(savedRequest);
      mockNotificationService.createGlobalNotification.mockResolvedValue(undefined);

      const result = await service.createRequest(mockCreateRequestDto, 1n, [mockExpressFile]);

      expect(mockFileService.handleLocalUpload).toHaveBeenCalledWith(
        mockExpressFile,
        1n,
        1n
      );

      expect(mockRequestRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        requester: { id: 1n },
        project: { id: 1n },
        registrants: [{ id: 2n }],
        assignee: { id: 2n },
        title: mockCreateRequestDto.title,
        description: mockCreateRequestDto.description,
        dealAmount: mockCreateRequestDto.dealAmount,
        status: RequestStatus.Pending,
        isPublic: true,
        category: { id: 1n },
        targetLanguages: [],
        files: [mockFile],
        tags: [],
      }));

      expect(mockNotificationService.createGlobalNotification).toHaveBeenCalledWith({
        type: 'PUBLIC_REQUEST_CREATED',
        message: `New public request available: "${mockCreateRequestDto.title}" - $${mockCreateRequestDto.dealAmount}`,
        createdBy: 1n,
      });

      expect(result).toEqual(savedRequest);
    });

    it('should create request without optional parameters', async () => {
      const dtoWithoutOptionals = {
        title: 'Test Request',
        description: 'Test Description',
        dealAmount: 100,
        deadline: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString(),
        isPublic: true,
      };

      const createdRequest = { ...mockRequest, project: undefined, assignee: undefined, category: undefined, tags: undefined, files: [] };
      const savedRequest = { ...createdRequest, id: 1n };

      mockRequestRepository.create.mockReturnValue(createdRequest);
      mockRequestRepository.save.mockResolvedValue(savedRequest);
      mockNotificationService.createGlobalNotification.mockResolvedValue(undefined);

      const result = await service.createRequest(dtoWithoutOptionals, 1n);

      expect(mockRequestRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        requester: { id: 1n },
        project: undefined,
        registrants: [],
        assignee: undefined,
        title: dtoWithoutOptionals.title,
        description: dtoWithoutOptionals.description,
        dealAmount: dtoWithoutOptionals.dealAmount,
        status: RequestStatus.Pending,
        isPublic: true,
        category: undefined,
        targetLanguages: [],
        files: [],
        tags: [],
      }));

      expect(result).toEqual(savedRequest);
    });

    it('should throw BadRequestException when deadline is less than 7 days', async () => {
      const dtoWithShortDeadline = {
        ...mockCreateRequestDto,
        deadline: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
      };

      await expect(service.createRequest(dtoWithShortDeadline, 1n))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('createPrivateRequest', () => {
    it('should create private request successfully', async () => {
      const privateDto = { ...mockCreateRequestDto, isPublic: false };
      const createdRequest = { ...mockRequest, isPublic: false };
      const savedRequest = { ...mockRequest, id: 1n, isPublic: false };
      const requesterUser = { ...mockUser };
      const assigneeUser = { ...mockUser, id: 2n };
      const approvalUrl = 'https://paypal.com/approve';

      mockFileService.handleLocalUpload.mockResolvedValue({ fileId: '1' });
      mockFileRepository.findOneOrFail.mockResolvedValue(mockFile);
      mockRequestRepository.create.mockReturnValue(createdRequest);
      mockRequestRepository.save.mockResolvedValue(savedRequest);
      mockUserRepository.findOneOrFail
        .mockResolvedValueOnce(requesterUser)
        .mockResolvedValueOnce(assigneeUser);
      mockNotificationService.createNotification.mockResolvedValue(undefined);
      mockMailService.sendPrivateRequestConfirmation.mockResolvedValue(undefined);
      mockPaymentService.createPrivateDeposit.mockResolvedValue(approvalUrl);

      const result = await service.createPrivateRequest(privateDto, 1n, [mockExpressFile]);

      expect(mockNotificationService.createNotification).toHaveBeenCalledWith({
        userId: 2n,
        type: 'PRIVATE_REQUEST_CREATED',
        message: `You have received a new private request: "${privateDto.title}" from ${requesterUser.fullName || requesterUser.username}`,
        createdBy: 1n,
      });

      expect(mockMailService.sendPrivateRequestConfirmation).toHaveBeenCalledWith(
        assigneeUser.email,
        expect.objectContaining({
          title: privateDto.title,
          deadline: expect.any(Date),
          username: requesterUser.username,
        })
      );

      expect(mockPaymentService.createPrivateDeposit).toHaveBeenCalledWith(
        privateDto.dealAmount,
        requesterUser,
        savedRequest
      );

      expect(result).toEqual({
        request: savedRequest,
        approvalUrl,
      });
    });

    it('should throw BadRequestException when assigneeId is missing', async () => {
      const dtoWithoutAssignee = { ...mockCreateRequestDto, assigneeId: undefined, isPublic: false };

      await expect(service.createPrivateRequest(dtoWithoutAssignee, 1n))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when deadline is less than 7 days', async () => {
      const dtoWithShortDeadline = {
        ...mockCreateRequestDto,
        deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days from now
        isPublic: false,
      };

      await expect(service.createPrivateRequest(dtoWithShortDeadline, 1n))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('searchUsers', () => {
    it('should search users successfully', async () => {
      const users = [mockUser];
      const keyword = 'test';

      (mockUserRepository.createQueryBuilder() as any).getMany.mockResolvedValue(users);

      const result = await service.searchUsers(keyword, 1n);

      expect(mockUserRepository.createQueryBuilder).toHaveBeenCalledWith('user');
      expect(result).toEqual(users);
    });

    it('should return empty array when no users found', async () => {
      (mockUserRepository.createQueryBuilder() as any).getMany.mockResolvedValue([]);

      const result = await service.searchUsers('nonexistent', 1n);

      expect(result).toEqual([]);
    });
  });

  describe('getMyRequests', () => {
    it('should return user requests successfully', async () => {
      const requests = [mockRequest];

      (mockRequestRepository.createQueryBuilder() as any).getMany.mockResolvedValue(requests);

      const result = await service.getMyRequests(1n);

      expect(mockRequestRepository.createQueryBuilder).toHaveBeenCalledWith('requests');
      expect(result).toEqual(requests);
    });

    it('should return empty array when no requests found', async () => {
      (mockRequestRepository.createQueryBuilder() as any).getMany.mockResolvedValue([]);

      const result = await service.getMyRequests(1n);

      expect(result).toEqual([]);
    });
  });

  describe('fetchRequests', () => {
    it('should return public requests with registration status', async () => {
      const requests = [
        {
          ...mockRequest,
          registrants: [{ id: 1n }],
        },
        {
          ...mockRequest,
          id: 2n,
          registrants: [],
        },
      ];

      (mockRequestRepository.createQueryBuilder() as any).getMany.mockResolvedValue(requests);

      const result = await service.fetchRequests(1n);

      expect(mockRequestRepository.createQueryBuilder).toHaveBeenCalledWith('requests');
      expect(result).toHaveLength(2);
      expect(result[0].isRegistered).toBe(true);
      expect(result[1].isRegistered).toBe(false);
    });

    it('should throw NotFoundException when no requests found', async () => {
      (mockRequestRepository.createQueryBuilder() as any).getMany.mockResolvedValue([]);

      await expect(service.fetchRequests(1n)).rejects.toThrow(NotFoundException);
    });
  });

  describe('fetchPrivateRequests', () => {
    it('should return private requests for user', async () => {
      const requests = [mockRequest];

      mockRequestRepository.createQueryBuilder().getMany.mockResolvedValue(requests);

      const result = await service.fetchPrivateRequests(1n);

      expect(mockRequestRepository.createQueryBuilder).toHaveBeenCalledWith('requests');
      expect(result).toEqual(requests);
    });

    it('should return empty array when no private requests found', async () => {
      mockRequestRepository.createQueryBuilder().getMany.mockResolvedValue([]);

      const result = await service.fetchPrivateRequests(1n);

      expect(result).toEqual([]);
    });
  });

  describe('fetchRequestDetails', () => {
    it('should return request details with registration status', async () => {
      const request = {
        ...mockRequest,
        registrants: [{ id: 1n }],
      };

      (mockRequestRepository.createQueryBuilder() as any).getOne.mockResolvedValue(request);

      const result = await service.fetchRequestDetails(1n, 1n);

      expect(mockRequestRepository.createQueryBuilder).toHaveBeenCalledWith('requests');
      expect(result.isRegistered).toBe(true);
    });

    it('should return false for registration status when user not registered', async () => {
      const request = {
        ...mockRequest,
        registrants: [{ id: 2n }],
      };

      (mockRequestRepository.createQueryBuilder() as any).getOne.mockResolvedValue(request);

      const result = await service.fetchRequestDetails(1n, 1n);

      expect(result.isRegistered).toBe(false);
    });

    it('should return false for registration status when no registrants', async () => {
      const request = {
        ...mockRequest,
        registrants: [],
      };

      (mockRequestRepository.createQueryBuilder() as any).getOne.mockResolvedValue(request);

      const result = await service.fetchRequestDetails(1n, 1n);

      expect(result.isRegistered).toBe(false);
    });
  });

  describe('updateRequest', () => {
    it('should update request successfully', async () => {
      const updateData = {
        title: 'Updated Title',
        description: 'Updated Description',
        dealAmount: 200,
      };

      const existingRequest = { ...mockRequest };
      const updatedRequest = { ...existingRequest, ...updateData };

      mockRequestRepository.findOne.mockResolvedValue(existingRequest);
      mockRequestRepository.save.mockResolvedValue(updatedRequest);

      const result = await service.updateRequest(1n, 1n, updateData);

      expect(mockRequestRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1n },
        relations: ['requester', 'category', 'tags'],
      });

      expect(mockRequestRepository.save).toHaveBeenCalledWith(updatedRequest);
      expect(result).toEqual(updatedRequest);
    });

    it('should throw BadRequestException when no fields to update', async () => {
      const updateData = {};

      await expect(service.updateRequest(1n, 1n, updateData))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when request not found', async () => {
      const updateData = { title: 'Updated Title' };

      mockRequestRepository.findOne.mockResolvedValue(null);

      await expect(service.updateRequest(1n, 1n, updateData))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when user is not requester', async () => {
      const updateData = { title: 'Updated Title' };
      const existingRequest = { ...mockRequest, requester: { id: 2n } };

      mockRequestRepository.findOne.mockResolvedValue(existingRequest);

      await expect(service.updateRequest(1n, 1n, updateData))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when request is not pending', async () => {
      const updateData = { title: 'Updated Title' };
      const existingRequest = { ...mockRequest, status: RequestStatus.Approved };

      mockRequestRepository.findOne.mockResolvedValue(existingRequest);

      await expect(service.updateRequest(1n, 1n, updateData))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when deadline is less than 7 days', async () => {
      const updateData = {
        deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days from now
      };

      const existingRequest = { ...mockRequest };

      mockRequestRepository.findOne.mockResolvedValue(existingRequest);

      await expect(service.updateRequest(1n, 1n, updateData))
        .rejects.toThrow(BadRequestException);
    });

    it('should update category when categoryId provided', async () => {
      const updateData = { categoryId: '2' };
      const existingRequest = { ...mockRequest };
      const newCategory = { id: 2n, name: 'New Category' };

      mockRequestRepository.findOne.mockResolvedValue(existingRequest);
      mockCategoryRepository.findOne.mockResolvedValue(newCategory);
      mockRequestRepository.save.mockResolvedValue(existingRequest);

      await service.updateRequest(1n, 1n, updateData);

      expect(mockCategoryRepository.findOne).toHaveBeenCalledWith({
        where: { id: 2n },
      });
      expect(existingRequest.category).toEqual(newCategory);
    });

    it('should throw BadRequestException when category not found', async () => {
      const updateData = { categoryId: '999' };
      const existingRequest = { ...mockRequest };

      mockRequestRepository.findOne.mockResolvedValue(existingRequest);
      mockCategoryRepository.findOne.mockResolvedValue(null);

      await expect(service.updateRequest(1n, 1n, updateData))
        .rejects.toThrow(BadRequestException);
    });

    it('should create new tags when tags provided', async () => {
      const updateData = { tags: ['new-tag'] };
      const existingRequest = { ...mockRequest };
      const newTag = { id: 2n, name: 'new-tag' };

      mockRequestRepository.findOne.mockResolvedValue(existingRequest);
      mockProjectTagRepository.findOne.mockResolvedValue(null);
      mockProjectTagRepository.create.mockReturnValue(newTag);
      mockProjectTagRepository.save.mockResolvedValue(newTag);
      mockRequestRepository.save.mockResolvedValue(existingRequest);

      await service.updateRequest(1n, 1n, updateData);

      expect(mockProjectTagRepository.create).toHaveBeenCalledWith({ name: 'new-tag' });
      expect(existingRequest.tags).toEqual([newTag]);
    });

    it('should handle file uploads when files provided', async () => {
      const updateData = { files: [mockExpressFile] };
      const existingRequest = { ...mockRequest };

      mockRequestRepository.findOne.mockResolvedValue(existingRequest);
      mockFileService.saveFile.mockResolvedValue({ fileId: '2' });
      mockRequestRepository.save.mockResolvedValue(existingRequest);

      await service.updateRequest(1n, 1n, updateData);

      expect(mockFileService.saveFile).toHaveBeenCalledWith({
        uid: 1n,
        fileName: 'test.txt',
        fileType: 'text/plain',
        fileContent: Buffer.from('test content'),
        requestId: 1n,
      });
    });
  });

  describe('cancelRequest', () => {
    it('should cancel public request successfully', async () => {
      const existingRequest = { ...mockRequest };
      const cancelledRequest = { ...existingRequest, status: RequestStatus.Cancelled };

      mockRequestRepository.findOne.mockResolvedValue(existingRequest);
      mockRequestRepository.save.mockResolvedValue(cancelledRequest);

      const result = await service.cancelRequest(1n, 1n);

      expect(mockRequestRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1n },
        relations: ['requester'],
      });

      expect(mockRequestRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: RequestStatus.Cancelled })
      );

      expect(result).toEqual(cancelledRequest);
    });

    it('should cancel private request and refund deposit', async () => {
      const existingRequest = { ...mockRequest, isPublic: false };
      const cancelledRequest = { ...existingRequest, status: RequestStatus.Cancelled };
      const transaction = {
        id: 1n,
        amount: 100,
        status: TransactionStatus.Pending,
      };
      const adminWallet = { id: 1n, balance: 100 };
      const requesterWallet = { id: 2n, balance: 0 };

      mockRequestRepository.findOne.mockResolvedValue(existingRequest);
      mockTransactionRepository.findOne.mockResolvedValue(transaction);
      mockWalletService.getOrCreateWallet
        .mockResolvedValueOnce(adminWallet)  // First call for admin wallet
        .mockResolvedValueOnce(requesterWallet);  // Second call for requester wallet
      mockTransactionRepository.save.mockResolvedValue({ ...transaction, status: TransactionStatus.Failed });
      mockWalletRepository.save
        .mockImplementationOnce((wallet: WalletEntity) => ({ ...wallet }))  // Return updated admin wallet
        .mockImplementationOnce((wallet: WalletEntity) => ({ ...wallet }));  // Return updated requester wallet
      mockRequestRepository.save.mockResolvedValue(cancelledRequest);

      const result = await service.cancelRequest(1n, 1n);

      expect(mockTransactionRepository.findOne).toHaveBeenCalledWith({
        where: {
          request: { id: 1n },
          user: { id: 1n },
          status: In([TransactionStatus.Pending, TransactionStatus.On_Hold]),
        },
      });

      // Verify admin wallet was debited
      expect(adminWallet.balance).toBe(0);  // Admin wallet should be debited by 100
      
      // Verify requester wallet was credited
      expect(requesterWallet.balance).toBe(100);  // Requester wallet should be credited with 100
      
      // Verify transaction status was updated
      expect(transaction.status).toBe(TransactionStatus.Failed);

      expect(result).toEqual(cancelledRequest);
    });

    it('should throw NotFoundException when request not found', async () => {
      mockRequestRepository.findOne.mockResolvedValue(null);

      await expect(service.cancelRequest(1n, 1n))
        .rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when user is not requester', async () => {
      const existingRequest = { ...mockRequest, requester: { id: 2n } };

      mockRequestRepository.findOne.mockResolvedValue(existingRequest);

      await expect(service.cancelRequest(1n, 1n))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when request is not pending', async () => {
      const existingRequest = { ...mockRequest, status: RequestStatus.Approved };

      mockRequestRepository.findOne.mockResolvedValue(existingRequest);

      await expect(service.cancelRequest(1n, 1n))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('registerForPublicRequest', () => {
    it('should register user for public request successfully', async () => {
      const existingRequest = { ...mockRequest, registrants: [] };
      const registerUser = { ...mockUser, id: 2n };

      mockRequestRepository.findOneOrFail.mockResolvedValue(existingRequest);
      mockUserRepository.findOneOrFail.mockResolvedValue(registerUser);
      mockRequestRepository.save.mockResolvedValue(existingRequest);
      mockNotificationService.createNotification.mockResolvedValue(undefined);
      mockMailService.notifyRequesterOfRegistration.mockResolvedValue(undefined);
      mockChatService.openChatBetween.mockResolvedValue(undefined);

      await service.registerForPublicRequest(1n, 2);

      expect(mockRequestRepository.findOneOrFail).toHaveBeenCalledWith({
        where: { id: 1n },
        relations: ['requester'],
      });

      expect(mockUserRepository.findOneOrFail).toHaveBeenCalledWith({
        where: { id: 2n },
      });

      expect(existingRequest.registrants).toContain(registerUser);

      expect(mockNotificationService.createNotification).toHaveBeenCalledWith({
        userId: 1n,
        type: 'PUBLIC_REQUEST_REGISTERED',
        message: `${registerUser.fullName || registerUser.username} has registered for your public request: "${existingRequest.title}"`,
        createdBy: 2n,
      });

      expect(mockChatService.openChatBetween).toHaveBeenCalledWith(
        { id: 2, username: registerUser.username },
        { id: 1, username: existingRequest.requester.username }
      );
    });

    it('should throw BadRequestException when user tries to register for own request', async () => {
      const existingRequest = { ...mockRequest, registrants: [] };

      mockRequestRepository.findOneOrFail.mockResolvedValue(existingRequest);
      mockUserRepository.findOneOrFail.mockResolvedValue(mockUser);

      await expect(service.registerForPublicRequest(1n, 1))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when request is not pending', async () => {
      const existingRequest = { ...mockRequest, status: RequestStatus.Approved };

      mockRequestRepository.findOneOrFail.mockResolvedValue(existingRequest);

      await expect(service.registerForPublicRequest(1n, 2))
        .rejects.toThrow(BadRequestException);
    });

    it('should not add duplicate registrant', async () => {
      const existingRequest = { ...mockRequest, registrants: [{ id: 2n }] };
      const registerUser = { ...mockUser, id: 2n };

      mockRequestRepository.findOneOrFail.mockResolvedValue(existingRequest);
      mockUserRepository.findOneOrFail.mockResolvedValue(registerUser);

      await service.registerForPublicRequest(1n, 2);

      expect(mockRequestRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('getRequestRegistrants', () => {
    it('should return request registrants successfully', async () => {
      const existingRequest = { ...mockRequest, registrants: [{ id: 2n }, { id: 3n }] };
      const registrants = [
        { id: 2n, fullName: 'User 2', email: 'user2@example.com', phone: '+1234567890', createdAt: new Date() },
        { id: 3n, fullName: 'User 3', email: 'user3@example.com', phone: '+1234567891', createdAt: new Date() },
      ];

      mockRequestRepository.findOneOrFail.mockResolvedValue(existingRequest);
      (mockUserRepository.createQueryBuilder() as any).getMany.mockResolvedValue(registrants);

      const result = await service.getRequestRegistrants(1n);

      expect(mockRequestRepository.findOneOrFail).toHaveBeenCalledWith({
        where: { id: 1n },
        relations: ['registrants'],
      });

      expect(mockUserRepository.createQueryBuilder).toHaveBeenCalledWith('user');
      expect(result).toEqual(registrants);
    });

    it('should return empty array when no registrants', async () => {
      const existingRequest = { ...mockRequest, registrants: [] };

      mockRequestRepository.findOneOrFail.mockResolvedValue(existingRequest);

      const result = await service.getRequestRegistrants(1n);

      expect(result).toEqual([]);
    });
  });

  describe('approveRegistrant', () => {
    it('should approve registrant successfully', async () => {
      const existingRequest = { ...mockRequest, assignee: null };
      const selectedUser = { ...mockUser, id: 2n };
      const approvalUrl = 'https://paypal.com/approve';

      mockRequestRepository.findOneOrFail.mockResolvedValue(existingRequest);
      mockUserRepository.findOneOrFail.mockResolvedValue(selectedUser);
      mockPaymentService.createDeposit.mockResolvedValue(approvalUrl);
      mockNotificationService.createNotification.mockResolvedValue(undefined);

      const result = await service.approveRegistrant(1, 2);

      expect(mockRequestRepository.findOneOrFail).toHaveBeenCalledWith({
        where: { id: 1n },
        relations: ['requester', 'assignee', 'registrants', 'category'],
      });

      expect(mockUserRepository.findOneOrFail).toHaveBeenCalledWith({
        where: { id: 2n },
      });

      expect(mockPaymentService.createDeposit).toHaveBeenCalledWith(
        existingRequest.dealAmount,
        selectedUser,
        existingRequest
      );

      expect(mockNotificationService.createNotification).toHaveBeenCalledWith({
        userId: 2n,
        type: 'REGISTRANT_APPROVED',
        message: `Your registration for request "${existingRequest.title}" has been approved! Please complete the payment to proceed.`,
        createdBy: 1n,
      });

      expect(result).toEqual({ approvalUrl });
    });

    it('should throw BadRequestException when request already has assignee', async () => {
      const existingRequest = { ...mockRequest, assignee: { id: 2n } };

      mockRequestRepository.findOneOrFail.mockResolvedValue(existingRequest);

      await expect(service.approveRegistrant(1, 3))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw error when approval URL generation fails', async () => {
      const existingRequest = { ...mockRequest, assignee: null };
      const selectedUser = { ...mockUser, id: 2n };

      mockRequestRepository.findOneOrFail.mockResolvedValue(existingRequest);
      mockUserRepository.findOneOrFail.mockResolvedValue(selectedUser);
      mockPaymentService.createDeposit.mockResolvedValue(null);

      await expect(service.approveRegistrant(1, 2))
        .rejects.toThrow('Failed to generate PayPal approval URL.');
    });
  });

  describe('declinePrivateRequest', () => {
    it('should decline private request successfully', async () => {
      const existingRequest = { ...mockRequest, isPublic: false };
      const transaction = {
        id: 1n,
        amount: 100,
        status: TransactionStatus.Pending,
      };
      const wallet = { id: 1n, balance: 0 };

      mockRequestRepository.findOneOrFail.mockResolvedValue(existingRequest);
      mockTransactionRepository.findOne.mockResolvedValue(transaction);
      mockWalletService.getOrCreateWallet.mockResolvedValue(wallet);
      mockTransactionRepository.save.mockResolvedValue(transaction);
      mockWalletRepository.save.mockResolvedValue(wallet);
      mockRequestRepository.save.mockResolvedValue(existingRequest);
      mockNotificationService.createNotification.mockResolvedValue(undefined);

      const result = await service.declinePrivateRequest(1n);

      expect(mockRequestRepository.findOneOrFail).toHaveBeenCalledWith({
        where: { id: 1n },
        relations: ['requester'],
      });

      expect(wallet.balance).toBe(100);
      expect(transaction.status).toBe(TransactionStatus.Failed);
      expect(existingRequest.status).toBe(RequestStatus.Rejected);

      expect(mockNotificationService.createNotification).toHaveBeenCalledWith({
        userId: 1n,
        type: 'PRIVATE_REQUEST_DECLINED',
        message: `Your private request "${existingRequest.title}" has been declined by the assigned translator.`,
        createdBy: 0n,
      });

      expect(result).toBe(true);
    });

    it('should throw BadRequestException when request is public', async () => {
      const existingRequest = { ...mockRequest, isPublic: true };

      mockRequestRepository.findOneOrFail.mockResolvedValue(existingRequest);

      await expect(service.declinePrivateRequest(1n))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when request is not pending', async () => {
      const existingRequest = { ...mockRequest, isPublic: false, status: RequestStatus.Approved };

      mockRequestRepository.findOneOrFail.mockResolvedValue(existingRequest);

      await expect(service.declinePrivateRequest(1n))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when no transaction found', async () => {
      const existingRequest = { ...mockRequest, isPublic: false };

      mockRequestRepository.findOneOrFail.mockResolvedValue(existingRequest);
      mockTransactionRepository.findOne.mockResolvedValue(null);

      await expect(service.declinePrivateRequest(1n))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('acceptPrivateRequest', () => {
    it('should accept private request and create project successfully', async () => {
      const existingRequest = { ...mockRequest, isPublic: false, assignee: { id: 2n } };
      const projectId = 1n;
      const newProject = { id: projectId, name: 'New Project' };

      mockRequestRepository.findOneOrFail.mockResolvedValue(existingRequest);
      mockProjectService.createProjectFromRequest.mockResolvedValue({ projectId });
      mockProjectRepository.findOneOrFail.mockResolvedValue(newProject);
      mockNotificationService.createNotification.mockResolvedValue(undefined);

      const result = await service.acceptPrivateRequest(1n, 2n);

      expect(mockRequestRepository.findOneOrFail).toHaveBeenCalledWith({
        where: { id: 1n },
        relations: ['assignee', 'requester', 'category', 'files'],
      });

      expect(mockProjectService.createProjectFromRequest).toHaveBeenCalledWith(
        existingRequest,
        2n
      );

      expect(existingRequest.project).toEqual(newProject);
      expect(existingRequest.status).toBe(RequestStatus.Approved);

      expect(mockNotificationService.createNotification).toHaveBeenCalledWith({
        userId: 1n,
        type: 'PRIVATE_REQUEST_ACCEPTED',
        message: `Your private request "${existingRequest.title}" has been accepted and a project has been created!`,
        createdBy: 2n,
      });

      expect(result).toEqual({
        success: true,
        message: 'Private request accepted and project created.',
        projectId,
        requestId: existingRequest.id,
      });
    });

    it('should throw BadRequestException when request is public', async () => {
      const existingRequest = { ...mockRequest, isPublic: true };

      mockRequestRepository.findOneOrFail.mockResolvedValue(existingRequest);

      await expect(service.acceptPrivateRequest(1n, 2n))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when request is not pending', async () => {
      const existingRequest = { ...mockRequest, isPublic: false, status: RequestStatus.Approved };

      mockRequestRepository.findOneOrFail.mockResolvedValue(existingRequest);

      await expect(service.acceptPrivateRequest(1n, 2n))
        .rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when user is not assigned translator', async () => {
      const existingRequest = { ...mockRequest, isPublic: false, assignee: { id: 3n } };

      mockRequestRepository.findOneOrFail.mockResolvedValue(existingRequest);

      await expect(service.acceptPrivateRequest(1n, 2n))
        .rejects.toThrow(BadRequestException);
    });

    it('should handle transaction rollback on error', async () => {
      const existingRequest = { ...mockRequest, isPublic: false, assignee: { id: 2n } };

      mockRequestRepository.findOneOrFail.mockResolvedValue(existingRequest);
      mockProjectService.createProjectFromRequest.mockRejectedValue(new Error('Project creation failed'));

      await expect(service.acceptPrivateRequest(1n, 2n))
        .rejects.toThrow(InternalServerErrorException);
    });
  });
});
