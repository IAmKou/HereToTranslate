import { PaypalService } from '../service/payment-manager.service';
import { Repository } from 'typeorm';
import axios from 'axios';
import {
  ProjectEntity,
  RequestEntity,
  RequestStatus,
  TransactionEntity,
  TransactionStatus,
  UserEntity,
  WalletEntity,
  TranslationApprovalEntity,
} from '#LocalProject/Entities';
import { ProjectManagerService } from '../service/project-manager.service';
import { MailService } from '../../mailer/mailer.service';
import { WalletManagerService } from '../service/wallet-manager.service';
import { ManifestService } from '../service/manifest.service';
import { FeeService } from '../service/fee-manager.service';
import { NotificationManagerService } from '../service/notification-manager.service';
import { WithdrawDto } from '../../dto/withdraw.dto';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock environment variables
process.env.PAYPAL_API = 'https://api-m.sandbox.paypal.com';
process.env.PAYPAL_CLIENT_ID = 'test-client-id';
process.env.PAYPAL_CLIENT_SECRET = 'test-client-secret';
process.env.CLIENT_URL = 'http://localhost:4200';

describe('PaypalService', () => {
  let service: PaypalService;
  let mockTransactionRepo: jest.Mocked<Repository<TransactionEntity>>;
  let mockProjectRepository: jest.Mocked<Repository<ProjectEntity>>;
  let mockRequestRepository: jest.Mocked<Repository<RequestEntity>>;
  let mockTranslationApprovalRepository: jest.Mocked<
    Repository<TranslationApprovalEntity>
  >;
  let mockWalletRepository: jest.Mocked<Repository<WalletEntity>>;
  let mockUserRepository: jest.Mocked<Repository<UserEntity>>;
  let mockProjectService: jest.Mocked<ProjectManagerService>;
  let mockMailService: jest.Mocked<MailService>;
  let mockWalletManagerService: jest.Mocked<WalletManagerService>;
  let mockManifestService: jest.Mocked<ManifestService>;
  let mockFeeService: jest.Mocked<FeeService>;
  let mockNotificationService: jest.Mocked<NotificationManagerService>;

  const mockUser: any = {
    id: 1n,
    email: 'test@example.com',
    username: 'testuser',
    fullName: 'Test User',
    phone: '+1234567890',
  };

  const mockRequest: any = {
    id: 1n,
    title: 'Test Request',
    description: 'Test Description',
    isPublic: true,
    status: RequestStatus.Pending,
    requester: mockUser,
    assignee: undefined,
    registrants: [],
    category: { id: 1n, name: 'Test Category' },
    files: [],
    project: undefined,
    dealAmount: 100,
    deadline: new Date(),
    createdAt: new Date(),
    tags: [],
    targetLanguages: [],
  };

  const mockTransaction: any = {
    id: 1,
    user: mockUser,
    request: mockRequest,
    amount: 100,
    status: TransactionStatus.Pending,
    paypalOrderId: 'test-order-id',
    paypalEmail: 'test@example.com',
    createdAt: new Date(),
  };

  const mockWallet: any = {
    id: 1,
    user: mockUser,
    balance: 1000,
    paypalEmail: 'test@example.com',
  };

  beforeEach(() => {
    // Create mocks for repositories
    mockTransactionRepo = {
      save: jest.fn(),
      findOneOrFail: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      createQueryBuilder: jest.fn(),
    } as any;

    mockProjectRepository = {
      findOneOrFail: jest.fn(),
    } as any;

    mockRequestRepository = {
      findOneOrFail: jest.fn(),
      save: jest.fn(),
    } as any;

    mockTranslationApprovalRepository = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
    } as any;

    mockWalletRepository = {
      save: jest.fn(),
    } as any;

    mockUserRepository = {
      findOneOrFail: jest.fn(),
      findOneByOrFail: jest.fn(),
    } as any;

    // Create mocks for services
    mockProjectService = {
      createProjectFromRequest: jest.fn(),
    } as any;

    mockMailService = {
      notifyAllOthersRequestTaken: jest.fn(),
    } as any;

    mockWalletManagerService = {
      getOrCreateWallet: jest.fn(),
      addToBalance: jest.fn(),
    } as any;

    mockManifestService = {
      generateManifest: jest.fn(),
    } as any;

    mockFeeService = {
      getDefaultFee: jest.fn(),
    } as any;

    mockNotificationService = {
      createNotification: jest.fn(),
    } as any;

    // Mock query runner
    const mockQueryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: {
        save: jest.fn(),
        findOne: jest.fn(),
      },
    };

    // Set up the mock for createQueryRunner
    const mockCreateQueryRunner = jest.fn().mockReturnValue(mockQueryRunner);
    (mockProjectService as any).dataSource = {
      createQueryRunner: mockCreateQueryRunner,
    };

    // Create service instance
    service = new PaypalService(
      mockTransactionRepo,
      mockProjectRepository,
      mockRequestRepository,
      mockTranslationApprovalRepository,
      mockWalletRepository,
      mockUserRepository,
      mockProjectService,
      mockMailService,
      mockWalletManagerService,
      mockManifestService,
      mockFeeService,
      mockNotificationService
    );

    // Reset axios mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getAccessToken', () => {
    it('should return cached access token if available', async () => {
      // Set private access token
      (service as any).accessToken = 'cached-token';

      const result = await (service as any).getAccessToken();

      expect(result).toBe('cached-token');
      expect(mockedAxios.post).not.toHaveBeenCalled();
    });

    it('should fetch new access token if not cached', async () => {
      const mockResponse = {
        data: { access_token: 'new-token' },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const result = await (service as any).getAccessToken();

      expect(result).toBe('new-token');
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://api-m.sandbox.paypal.com/v1/oauth2/token',
        'grant_type=client_credentials',
        {
          headers: {
            Authorization: 'Basic dGVzdC1jbGllbnQtaWQ6dGVzdC1jbGllbnQtc2VjcmV0',
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );
    });

    it('should throw error if PayPal authentication fails', async () => {
      mockedAxios.post.mockRejectedValue(new Error('Auth failed'));

      await expect((service as any).getAccessToken()).rejects.toThrow(
        'Failed to authenticate with PayPal'
      );
    });
  });

  describe('createDeposit', () => {
    it('should create PayPal deposit successfully', async () => {
      const mockResponse = {
        data: {
          id: 'test-order-id',
          links: [{ rel: 'approve', href: 'https://paypal.com/approve' }],
        },
      };

      mockedAxios.post
        .mockResolvedValueOnce({ data: { access_token: 'test-token' } }) // auth
        .mockResolvedValueOnce(mockResponse); // create order
      mockTransactionRepo.save.mockResolvedValue(mockTransaction);

      const result = await service.createDeposit(100, mockUser, mockRequest);

      expect(result).toBe('https://paypal.com/approve');
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://api-m.sandbox.paypal.com/v2/checkout/orders',
        expect.objectContaining({
          intent: 'CAPTURE',
          purchase_units: [
            expect.objectContaining({
              amount: { currency_code: 'USD', value: '50.00' },
              description: '50% Deposit for request ID 1',
            }),
          ],
        }),
        expect.any(Object)
      );
      expect(mockTransactionRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          user: mockUser,
          request: mockRequest,
          amount: 50,
          status: TransactionStatus.Pending,
          paypalOrderId: 'test-order-id',
        })
      );
    });

    it('should throw error for invalid amount', async () => {
      await expect(
        service.createDeposit('invalid' as any, mockUser, mockRequest)
      ).rejects.toThrow('Invalid amount for PayPal deposit');
    });

    it('should throw error if no approval URL returned', async () => {
      const mockResponse = {
        data: {
          id: 'test-order-id',
          links: [],
        },
      };

      mockedAxios.post
        .mockResolvedValueOnce({ data: { access_token: 'test-token' } }) // auth
        .mockResolvedValueOnce(mockResponse); // create order

      await expect(
        service.createDeposit(100, mockUser, mockRequest)
      ).rejects.toThrow('Failed to create PayPal deposit');
    });
  });

  describe('createPrivateDeposit', () => {
    it('should create private PayPal deposit successfully', async () => {
      const mockResponse = {
        data: {
          id: 'test-order-id',
          links: [{ rel: 'approve', href: 'https://paypal.com/approve' }],
        },
      };

      mockedAxios.post
        .mockResolvedValueOnce({ data: { access_token: 'test-token' } }) // auth
        .mockResolvedValueOnce(mockResponse); // create order
      mockTransactionRepo.save.mockResolvedValue(mockTransaction);

      const result = await service.createPrivateDeposit(
        100,
        mockUser,
        mockRequest
      );

      expect(result).toBe('https://paypal.com/approve');
      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://api-m.sandbox.paypal.com/v2/checkout/orders',
        expect.objectContaining({
          intent: 'CAPTURE',
          purchase_units: [
            expect.objectContaining({
              amount: { currency_code: 'USD', value: '50.00' },
              description: '50% Deposit (5% fee included) for request ID 1',
            }),
          ],
        }),
        expect.any(Object)
      );
      expect(mockTransactionRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          user: mockUser,
          request: mockRequest,
          amount: 50,
          status: TransactionStatus.Pending,
          paypalOrderId: 'test-order-id',
        })
      );
    });
  });

  describe('capturePaymentAndCreateProject', () => {
    // Create fresh wallet objects for all tests in this describe block to avoid balance contamination
    const freshTranslatorWallet = { ...mockWallet, balance: 1000 };
    const freshPayerWallet = { ...mockWallet, balance: 1000 };
    const freshAdminWallet = { ...mockWallet, balance: 1000 };
    
    it('should capture payment and create project successfully', async () => {
      const mockCaptureResponse = { status: 201 };
      const mockProject = { id: 2n, name: 'Test Project' } as ProjectEntity;
      const mockTranslator = {
        id: 2n,
        email: 'translator@example.com',
      } as UserEntity;

      mockedAxios.post
        .mockResolvedValueOnce({ data: { access_token: 'test-token' } }) // auth
        .mockResolvedValueOnce(mockCaptureResponse); // capture
      mockTransactionRepo.findOneOrFail.mockResolvedValue({
        ...mockTransaction,
        request: {
          ...mockRequest,
          registrants: [mockUser, mockTranslator],
        },
      });
      mockProjectService.createProjectFromRequest.mockResolvedValue({
        message: 'Project created',
        projectId: 2n,
        branchId: 1n,
      });
      mockProjectRepository.findOneOrFail.mockResolvedValue(mockProject);
      mockWalletManagerService.getOrCreateWallet
        .mockResolvedValueOnce(freshTranslatorWallet) // translator wallet
        .mockResolvedValueOnce(freshPayerWallet) // payer wallet
        .mockResolvedValueOnce(freshAdminWallet); // admin wallet (user ID 1n)
      
      // Mock transaction creation for translator and requester transactions
      mockTransactionRepo.create
        .mockReturnValueOnce({
          id: 2,
          user: { id: 2n, email: 'translator@example.com' },
          request: { id: 1n },
          amount: 100,
          status: TransactionStatus.On_Hold,
          paypalEmail: 'translator@example.com',
        } as any) // translator transaction
        .mockReturnValueOnce({
          id: 3,
          user: { id: 1n, email: 'test@example.com' },
          request: { id: 1n },
          amount: 100,
          status: TransactionStatus.On_Hold,
          paypalEmail: 'test@example.com',
        } as any); // requester transaction

      const mockQueryRunner = {
        connect: jest.fn(),
        startTransaction: jest.fn(),
        commitTransaction: jest.fn(),
        rollbackTransaction: jest.fn(),
        release: jest.fn(),
        manager: {
          save: jest.fn().mockResolvedValue(true),
        },
      };

      // Update the mock for this test
      (mockProjectService as any).dataSource = {
        createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
      };

      const result = await service.capturePaymentAndCreateProject(
        'test-order-id'
      );

      expect(result.success).toBe(true);
      expect(result.projectId).toBe(2n);
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should handle project creation failure and rollback', async () => {
      const mockCaptureResponse = { status: 201 };

      mockedAxios.post
        .mockResolvedValueOnce({ data: { access_token: 'test-token' } }) // auth
        .mockResolvedValueOnce(mockCaptureResponse); // capture
      mockTransactionRepo.findOneOrFail.mockResolvedValue({
        ...mockTransaction,
        request: {
          ...mockRequest,
          registrants: [
            mockUser,
            { id: 2n, email: 'translator@example.com' } as UserEntity,
          ],
        },
      });
      mockProjectService.createProjectFromRequest.mockRejectedValue(
        new Error('Project creation failed')
      );
      
      // Mock transaction creation for translator and requester transactions (even though they won't be reached in failure case)
      mockTransactionRepo.create
        .mockReturnValueOnce({
          id: 2,
          user: { id: 2n, email: 'translator@example.com' },
          request: { id: 1n },
          amount: 100,
          status: TransactionStatus.On_Hold,
          paypalEmail: 'translator@example.com',
        } as any) // translator transaction
        .mockReturnValueOnce({
          id: 3,
          user: { id: 1n, email: 'test@example.com' },
          request: { id: 1n },
          amount: 100,
          status: TransactionStatus.On_Hold,
          paypalEmail: 'test@example.com',
        } as any); // requester transaction
      
      // Mock wallet manager service for all wallet requests (even though they won't be reached in failure case)
      mockWalletManagerService.getOrCreateWallet
        .mockResolvedValueOnce(freshTranslatorWallet) // translator wallet
        .mockResolvedValueOnce(freshPayerWallet) // payer wallet
        .mockResolvedValueOnce(freshAdminWallet); // admin wallet (user ID 1n)

      const mockQueryRunner = {
        connect: jest.fn(),
        startTransaction: jest.fn(),
        rollbackTransaction: jest.fn(),
        release: jest.fn(),
        manager: {
          save: jest.fn().mockResolvedValue(true),
        },
      };

      // Update the mock for this test
      (mockProjectService as any).dataSource = {
        createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
      };

      const result = await service.capturePaymentAndCreateProject(
        'test-order-id'
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Project creation failed');
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });
  });

  describe('capturePayment', () => {
    it('should capture payment successfully for public request', async () => {
      const mockCaptureResponse = { status: 201 };
      const mockProject = { id: 2n, name: 'Test Project' } as ProjectEntity;

      mockedAxios.post
        .mockResolvedValueOnce({ data: { access_token: 'test-token' } }) // auth
        .mockResolvedValueOnce(mockCaptureResponse); // capture
      mockTransactionRepo.findOneOrFail.mockResolvedValue({
        ...mockTransaction,
        request: {
          ...mockRequest,
          isPublic: true,
          status: RequestStatus.Pending,
        },
      });
      mockProjectService.createProjectFromRequest.mockResolvedValue({
        message: 'Project created',
        projectId: 2n,
        branchId: 1n,
      });
      mockProjectRepository.findOneOrFail.mockResolvedValue(mockProject);
      // Create a fresh copy of the wallet for this test to avoid balance contamination
      const freshMockWallet = { ...mockWallet, balance: 1000 };
      
      // Mock wallet manager service to handle all wallet requests
      mockWalletManagerService.getOrCreateWallet.mockResolvedValue(freshMockWallet);
      mockWalletManagerService.addToBalance.mockResolvedValue(freshMockWallet);
      
      // Mock the walletRepository property that the service accesses via bracket notation
      (mockWalletManagerService as any).walletRepository = mockWalletRepository;
      
      // Mock wallet repository save for all wallet operations
      mockWalletRepository.save.mockResolvedValue(freshMockWallet);

      // Mock transaction creation and saving
      mockTransactionRepo.create.mockReturnValue({
        ...mockTransaction,
        user: { id: mockUser.id },
        request: { id: mockRequest.id },
      } as any);
      mockTransactionRepo.save.mockResolvedValue(mockTransaction);

      const result = await service.capturePayment('test-order-id');

      expect(result.success).toBe(true);
      expect(result.projectId).toBe(2n);
      expect(mockRequestRepository.save).toHaveBeenCalled();
      expect(mockWalletRepository.save).toHaveBeenCalled();
    });

    it('should handle payment capture failure', async () => {
      // Mock successful authentication first
      mockedAxios.post
        .mockResolvedValueOnce({ data: { access_token: 'test-token' } }) // auth
        .mockRejectedValueOnce(new Error('Capture failed')); // capture fails

      const result = await service.capturePayment('test-order-id');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Capture failed');
    });
  });

  describe('withdraw', () => {
    it('should create withdrawal transaction successfully', async () => {
      const withdrawDto: WithdrawDto = {
        amount: 100,
        paypalEmail: 'withdraw@example.com',
        requestId: 1n,
      };

      mockUserRepository.findOneOrFail.mockResolvedValue(mockUser);
      mockRequestRepository.findOneOrFail.mockResolvedValue(mockRequest);
      mockTransactionRepo.create.mockReturnValue(mockTransaction);
      mockTransactionRepo.save.mockResolvedValue(mockTransaction);

      const result = await service.withdraw(1n, withdrawDto);

      expect(result).toBe(mockTransaction);
      expect(mockTransactionRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user: mockUser,
          amount: -100,
          status: TransactionStatus.Pending,
          paypalEmail: 'withdraw@example.com',
          request: mockRequest,
        })
      );
      expect(mockTransactionRepo.save).toHaveBeenCalledWith(mockTransaction);
      expect(mockNotificationService.createNotification).toHaveBeenCalled();
    });

    it('should throw error for invalid amount', async () => {
      const withdrawDto: WithdrawDto = {
        amount: 0,
        paypalEmail: 'withdraw@example.com',
      };

      await expect(service.withdraw(1n, withdrawDto)).rejects.toThrow(
        'Amount must be positive'
      );
    });

    it('should throw error for invalid PayPal email', async () => {
      const withdrawDto: WithdrawDto = {
        amount: 100,
        paypalEmail: 'invalid-email',
      };

      await expect(service.withdraw(1n, withdrawDto)).rejects.toThrow(
        'Invalid PayPal email address'
      );
    });
  });

  describe('approveWithdrawal', () => {
    it('should approve withdrawal and process PayPal payout successfully', async () => {
      const mockTransactionWithStatus = {
        ...mockTransaction,
        status: TransactionStatus.Pending,
        user: mockUser,
      };

      const mockPayoutResponse = { status: 201 };

      // Create a fresh copy of the wallet for this test to avoid balance contamination
      const freshMockWallet = { ...mockWallet, balance: 1000 };
      
      mockTransactionRepo.findOneOrFail.mockResolvedValue(
        mockTransactionWithStatus
      );
      mockWalletManagerService.getOrCreateWallet.mockResolvedValue(freshMockWallet);
      mockedAxios.post
        .mockResolvedValueOnce({ data: { access_token: 'test-token' } }) // auth
        .mockResolvedValueOnce(mockPayoutResponse); // payout

      const result = await service.approveWithdrawal(1);

      expect(result).toBe(mockTransactionWithStatus);
      expect(mockTransactionWithStatus.status).toBe(
        TransactionStatus.Completed
      );
      expect(mockTransactionRepo.save).toHaveBeenCalledWith(
        mockTransactionWithStatus
      );
      expect(mockWalletRepository.save).toHaveBeenCalled();
      expect(mockNotificationService.createNotification).toHaveBeenCalled();
    });

    it('should throw error for non-pending transaction', async () => {
      const mockTransactionWithStatus = {
        ...mockTransaction,
        status: TransactionStatus.Completed,
      };

      mockTransactionRepo.findOneOrFail.mockResolvedValue(
        mockTransactionWithStatus
      );

      await expect(service.approveWithdrawal(1)).rejects.toThrow(
        'Transaction is not pending approval.'
      );
    });
  });

  describe('getAllPendingWithdrawals', () => {
    it('should return all pending withdrawal transactions', async () => {
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockTransaction]),
      };

      mockTransactionRepo.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any
      );

      const result = await service.getAllPendingWithdrawals();

      // Use a more flexible assertion that doesn't depend on exact date matching
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        id: mockTransaction.id,
        amount: mockTransaction.amount,
        status: mockTransaction.status,
        paypalEmail: mockTransaction.paypalEmail,
        paypalOrderId: mockTransaction.paypalOrderId,
      });
      expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
        't.user',
        'user'
      );
      expect(mockQueryBuilder.where).toHaveBeenCalledWith('t.amount < 0');
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        't.status = :status',
        { status: TransactionStatus.Pending }
      );
      expect(mockQueryBuilder.orderBy).toHaveBeenCalledWith(
        't.createdAt',
        'DESC'
      );
    });
  });

  describe('finalizeTranslation', () => {
    it('should finalize translation successfully', async () => {
      const mockRequestWithUsers = {
        ...mockRequest,
        assignee: { id: 2n, email: 'assignee@example.com' },
        requester: mockUser,
      };

      const mockRequesterApproval: any = {
        id: 1,
        request: { id: 1n },
        user: { id: 1n }, // requester ID
        isApproved: true,
        createdAt: new Date(),
      };

      const mockAssigneeApproval: any = {
        id: 2,
        request: { id: 1n },
        user: { id: 2n }, // assignee ID
        isApproved: true,
        createdAt: new Date(),
      };

      const mockTransactionForFinalize = {
        ...mockTransaction,
        status: TransactionStatus.Pending,
      };

      mockRequestRepository.findOneOrFail.mockResolvedValue(
        mockRequestWithUsers
      );
      
      // Mock the approveTranslation method to actually create approvals
      jest.spyOn(service, 'approveTranslation').mockResolvedValue(true);
      
      // Mock the approval repository to return the approvals when checked
      mockTranslationApprovalRepository.findOne
        .mockResolvedValueOnce(mockRequesterApproval) // requester approval
        .mockResolvedValueOnce(mockAssigneeApproval); // assignee approval
        
      // Create fresh wallet objects for this test to avoid balance contamination
      const freshMockWallet = { ...mockWallet, balance: 1000 };
      const freshAdminWallet = { ...mockWallet, balance: 1000 };
      
      mockTransactionRepo.findOneOrFail.mockResolvedValue(
        mockTransactionForFinalize
      );
      mockFeeService.getDefaultFee.mockResolvedValue(5); // 5% fee
      mockWalletManagerService.addToBalance.mockResolvedValue(freshMockWallet);
      
      // Mock getOrCreateWallet for both assignee and admin users
      mockWalletManagerService.getOrCreateWallet
        .mockResolvedValueOnce(freshMockWallet) // for assignee (user ID 2n)
        .mockResolvedValueOnce(freshAdminWallet); // for admin (user ID 1n) - create a copy
      
      // Mock admin user lookup for fee transaction
      mockUserRepository.findOneByOrFail.mockResolvedValue({
        id: 1n,
        email: 'admin@example.com',
        username: 'admin',
        fullName: 'Admin User',
      } as any);
      
      // Mock transaction creation for fee transaction
      mockTransactionRepo.create.mockReturnValue({
        id: 2,
        user: { id: 1n },
        request: { id: 1n },
        amount: 5, // 5% fee of 100
        status: TransactionStatus.Completed,
      } as any);

      const result = await service.finalizeTranslation(1n);

      expect(result).toBe(true);
      expect(mockTransactionForFinalize.status).toBe(
        TransactionStatus.Approved
      );
      expect(mockRequestWithUsers.status).toBe(RequestStatus.Completed);
      expect(mockTransactionRepo.save).toHaveBeenCalledTimes(2); // transaction + fee transaction
      expect(mockRequestRepository.save).toHaveBeenCalledWith(
        mockRequestWithUsers
      );
    });

    it('should throw error if request missing assignee or requester', async () => {
      const mockRequestWithoutUsers = {
        ...mockRequest,
        assignee: undefined,
        requester: undefined,
      };

      mockRequestRepository.findOneOrFail.mockResolvedValue(
        mockRequestWithoutUsers
      );

      await expect(service.finalizeTranslation(1n)).rejects.toThrow(
        'Request must have both requester and assignee.'
      );
    });

    it('should throw error if both parties have not approved', async () => {
      const mockRequestWithUsers = {
        ...mockRequest,
        assignee: { id: 2n, email: 'assignee@example.com' },
        requester: mockUser,
      };

      const mockApproval: any = {
        id: 1,
        request: { id: 1n },
        user: { id: 1n },
        isApproved: false,
        createdAt: new Date(),
      };

      mockRequestRepository.findOneOrFail.mockResolvedValue(
        mockRequestWithUsers
      );
      mockTranslationApprovalRepository.findOne
        .mockResolvedValueOnce(mockApproval) // requester approval
        .mockResolvedValueOnce(mockApproval); // assignee approval

      await expect(service.finalizeTranslation(1n)).rejects.toThrow(
        'Both parties must approve before finalizing.'
      );
    });
  });

  describe('approveTranslation', () => {
    it('should approve translation successfully', async () => {
      const mockRequestWithUsers = {
        ...mockRequest,
        assignee: { id: 2n, email: 'assignee@example.com' },
        requester: mockUser,
      };

      const mockApproval: any = {
        id: 1,
        request: { id: 1n },
        user: { id: 1n },
        isApproved: false,
        createdAt: new Date(),
      };

      mockRequestRepository.findOneOrFail.mockResolvedValue(
        mockRequestWithUsers
      );
      mockTranslationApprovalRepository.findOne.mockResolvedValue(mockApproval);
      mockTranslationApprovalRepository.save.mockResolvedValue(mockApproval);

      const result = await service.approveTranslation(1n, 1n);

      expect(result).toBe(true);
      expect(mockApproval.isApproved).toBe(true);
      expect(mockTranslationApprovalRepository.save).toHaveBeenCalledWith(
        mockApproval
      );
    });

    it('should create new approval if none exists', async () => {
      const mockRequestWithUsers = {
        ...mockRequest,
        assignee: { id: 2n, email: 'assignee@example.com' },
        requester: mockUser,
      };

      const mockNewApproval: any = {
        id: 1,
        request: { id: 1n },
        user: { id: 1n },
        isApproved: true,
        createdAt: new Date(),
      };

      mockRequestRepository.findOneOrFail.mockResolvedValue(
        mockRequestWithUsers
      );
      mockTranslationApprovalRepository.findOne.mockResolvedValue(null);
      mockTranslationApprovalRepository.create.mockReturnValue(mockNewApproval);
      mockTranslationApprovalRepository.save.mockResolvedValue(mockNewApproval);

      const result = await service.approveTranslation(1n, 1n);

      expect(result).toBe(true);
      expect(mockTranslationApprovalRepository.create).toHaveBeenCalledWith({
        request: { id: 1n },
        user: { id: 1n },
        isApproved: true,
      });
      expect(mockTranslationApprovalRepository.save).toHaveBeenCalledWith(
        mockNewApproval
      );
    });

    it('should throw error if user is not requester or assignee', async () => {
      const mockRequestWithUsers = {
        ...mockRequest,
        assignee: { id: 2n, email: 'assignee@example.com' },
        requester: mockUser,
      };

      mockRequestRepository.findOneOrFail.mockResolvedValue(
        mockRequestWithUsers
      );

      await expect(service.approveTranslation(1n, 999n)).rejects.toThrow(
        'Only requester or assignee can approve the translation.'
      );
    });
  });

  describe('payFinal50Percent', () => {
    it('should pay final 50% successfully', async () => {
      const mockRequestWithUsers = {
        ...mockRequest,
        assignee: { id: 2n, email: 'assignee@example.com' },
        requester: mockUser,
      };

      const mockApprovals: any[] = [
        {
          id: 1,
          request: { id: 1n },
          user: { id: 1n },
          isApproved: true,
          createdAt: new Date(),
        }, // requester
        {
          id: 2,
          request: { id: 1n },
          user: { id: 2n },
          isApproved: true,
          createdAt: new Date(),
        }, // assignee
      ];

      const mockOriginalTransaction = {
        ...mockTransaction,
        amount: 100,
      };

      mockRequestRepository.findOneOrFail.mockResolvedValue(
        mockRequestWithUsers
      );
      mockTranslationApprovalRepository.find.mockResolvedValue(mockApprovals);
      mockTransactionRepo.findOneOrFail.mockResolvedValue(
        mockOriginalTransaction
      );
      // Create a fresh copy of the wallet for this test to avoid balance contamination
      const freshMockWallet = { ...mockWallet, balance: 1000 };
      mockWalletManagerService.getOrCreateWallet.mockResolvedValue(freshMockWallet);
      mockTransactionRepo.create.mockReturnValue(mockTransaction);
      mockTransactionRepo.save.mockResolvedValue(mockTransaction);

      await service.payFinal50Percent(1n);

      expect(freshMockWallet.balance).toBe(900); // 1000 - 100
      expect(mockWalletRepository.save).toHaveBeenCalledWith(freshMockWallet);
      expect(mockTransactionRepo.create).toHaveBeenCalledWith({
        user: { id: 1n },
        request: { id: 1n },
        amount: 100,
        status: TransactionStatus.Completed,
      });
      expect(mockTransactionRepo.save).toHaveBeenCalledWith(mockTransaction);
    });

    it('should throw error if translation not approved by both parties', async () => {
      const mockRequestWithUsers = {
        ...mockRequest,
        assignee: { id: 2n, email: 'assignee@example.com' },
        requester: mockUser,
      };

      const mockApprovals: any[] = [
        {
          id: 1,
          request: { id: 1n },
          user: { id: 1n },
          isApproved: true,
          createdAt: new Date(),
        }, // requester only
      ];

      mockRequestRepository.findOneOrFail.mockResolvedValue(
        mockRequestWithUsers
      );
      mockTranslationApprovalRepository.find.mockResolvedValue(mockApprovals);

      await expect(service.payFinal50Percent(1n)).rejects.toThrow(
        'Translation not yet approved by both parties.'
      );
    });

    it('should throw error if insufficient balance', async () => {
      const mockRequestWithUsers = {
        ...mockRequest,
        assignee: { id: 2n, email: 'assignee@example.com' },
        requester: mockUser,
      };

      const mockApprovals: any[] = [
        {
          id: 1,
          request: { id: 1n },
          user: { id: 1n },
          isApproved: true,
          createdAt: new Date(),
        }, // requester
        {
          id: 2,
          request: { id: 1n },
          user: { id: 2n },
          isApproved: true,
          createdAt: new Date(),
        }, // assignee
      ];

      const mockOriginalTransaction = {
        ...mockTransaction,
        amount: 2000, // More than wallet balance
      };

      const mockWalletWithLowBalance = {
        ...mockWallet,
        balance: 1000,
      };

      mockRequestRepository.findOneOrFail.mockResolvedValue(
        mockRequestWithUsers
      );
      mockTranslationApprovalRepository.find.mockResolvedValue(mockApprovals);
      mockTransactionRepo.findOneOrFail.mockResolvedValue(
        mockOriginalTransaction
      );
      mockWalletManagerService.getOrCreateWallet.mockResolvedValue(
        mockWalletWithLowBalance
      );

      await expect(service.payFinal50Percent(1n)).rejects.toThrow(
        'Not enough balance to pay final 50%.'
      );
    });
  });

  describe('refundDeposit', () => {
    it('should refund deposit successfully', async () => {
      const mockDepositTransaction = {
        ...mockTransaction,
        amount: 50,
        status: TransactionStatus.Pending,
        user: mockUser,
      };

      // Create a fresh copy of the wallet for this test to avoid balance contamination
      const freshMockWallet = { ...mockWallet, balance: 1000 };
      mockTransactionRepo.findOne.mockResolvedValue(mockDepositTransaction);
      mockWalletManagerService.getOrCreateWallet.mockResolvedValue(freshMockWallet);
      mockTransactionRepo.create.mockReturnValue(mockTransaction);
      mockTransactionRepo.save.mockResolvedValue(mockTransaction);

      await service.refundDeposit(mockRequest);

      expect(freshMockWallet.balance).toBe(1050); // 1000 + 50
      expect(mockWalletRepository.save).toHaveBeenCalledWith(freshMockWallet);
      expect(mockDepositTransaction.status).toBe(TransactionStatus.Failed);
      expect(mockTransactionRepo.save).toHaveBeenCalledWith(
        mockDepositTransaction
      );
      expect(mockTransactionRepo.create).toHaveBeenCalledWith({
        user: { id: 1n },
        request: { id: 1n },
        amount: 50,
        status: TransactionStatus.Completed,
      });
      expect(mockNotificationService.createNotification).toHaveBeenCalled();
    });

    it('should handle case when no pending deposit transaction found', async () => {
      mockTransactionRepo.findOne.mockResolvedValue(null);

      await service.refundDeposit(mockRequest);

      expect(mockWalletRepository.save).not.toHaveBeenCalled();
      expect(mockTransactionRepo.save).not.toHaveBeenCalled();
    });
  });
});
