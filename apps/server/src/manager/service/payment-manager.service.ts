import axios from 'axios';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  ProjectEntity,
  RequestEntity,
  RequestStatus,
  TransactionEntity,
  TransactionStatus,
  TransactionType,
  UserEntity,
  WalletEntity,
} from '#LocalProject/Entities';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { ProjectManagerService } from '#LocalProject/Managers/service/project-manager.service';
import { MailService } from '../../mailer/mailer.service';
import { TranslationApprovalEntity } from '#LocalProject/Entities';
import { WalletManagerService } from './wallet-manager.service';
import { WithdrawDto } from '../../dto/withdraw.dto';
import { logger } from 'nx/src/utils/logger';
import { ManifestService } from '#LocalProject/Managers/service/manifest.service';
import { FeeService } from '#LocalProject/Managers/service/fee-manager.service';
import { NotificationManagerService } from './notification-manager.service';
import { PaypalConfigChecker } from './paypal-config-checker';

@Injectable()
export class PaypalService {
  private readonly api: string;
  private accessToken: string;
  private readonly ADMIN_USER_ID = 1n;

  private buildUrl(path: string): string {
    const baseUrl = process.env.CLIENT_URL || 'http://localhost:4200';
    // Remove trailing slash from baseUrl if it exists
    const cleanBaseUrl = baseUrl.replace(/\/+$/, '');
    // Remove leading slash from path if it exists
    const cleanPath = path.replace(/^\/+/, '');
    return `${cleanBaseUrl}/${cleanPath}`;
  }

  private buildServerUrl(path: string): string {
    // Backend absolute URL for PayPal callbacks
    const baseUrl = process.env.SERVER_URL || process.env.BACKEND_URL || 'http://localhost:3000';
    const cleanBaseUrl = baseUrl.replace(/\/+$/, '');
    const cleanPath = path.replace(/^\/+/, '');
    return `${cleanBaseUrl}/api/${cleanPath}`;
  }

  constructor(
    @InjectRepository(TransactionEntity)
    private transactionRepo: Repository<TransactionEntity>,
    @InjectRepository(ProjectEntity)
    private projectRepository: Repository<ProjectEntity>,
    @InjectRepository(RequestEntity)
    private requestRepository: Repository<RequestEntity>,
    @InjectRepository(TranslationApprovalEntity)
    private translationApprovalRepository: Repository<TranslationApprovalEntity>,
    @InjectRepository(WalletEntity)
    private walletRepository: Repository<WalletEntity>,
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>,
    private readonly projectService: ProjectManagerService,
    private readonly mailService: MailService,
    private readonly walletManagerService: WalletManagerService,
    private readonly manifestService: ManifestService,
    private readonly feeService: FeeService,
    private readonly notificationService: NotificationManagerService,
    private readonly configChecker: PaypalConfigChecker
  ) {
    if (!process.env.PAYPAL_API) {
      throw new Error('PAYPAL_API environment variable is not configured');
    }

    this.api = process.env.PAYPAL_API.replace(/\/+$/, '');

    console.log('🔧 PayPal service initialized with API:', this.api);

    this.configChecker.logConfiguration();
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken) return this.accessToken;

    if (!process.env.PAYPAL_CLIENT_ID || !process.env.PAYPAL_CLIENT_SECRET) {
      throw new InternalServerErrorException(
        'PayPal credentials not configured. Please check PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET environment variables.'
      );
    }

    const auth = Buffer.from(
      `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
    ).toString('base64');

    try {
      const tokenUrl = `${this.api.replace(/\/+$/, '')}/v1/oauth2/token`;

      console.log('🔐 Attempting PayPal authentication with URL:', tokenUrl);
      console.log('🔐 Client ID:', process.env.PAYPAL_CLIENT_ID?.substring(0, 8) + '...');

      const res = await axios.post(
        tokenUrl,
        'grant_type=client_credentials',
        {
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          timeout: 10000,
        }
      );

      this.accessToken = res.data.access_token;
      console.log('✅ PayPal authentication successful');
      return this.accessToken;
    } catch (err) {
      if (axios.isAxiosError(err)) {
        console.error('❌ PayPal authentication failed:', {
          status: err.response?.status,
          statusText: err.response?.statusText,
          data: err.response?.data,
          url: err.config?.url,
        });

        if (err.response?.status === 403) {
          throw new InternalServerErrorException(
            'PayPal authentication failed. Please check your client ID and secret, and ensure they are valid for the sandbox environment.'
          );
        }
      }

      console.error('❌ Unexpected error during PayPal authentication:', err);
      throw new InternalServerErrorException(
        'Failed to authenticate with PayPal. Please check your configuration and try again.'
      );
    }
  }

  async createDeposit(
    amount: number,
    user: UserEntity,
    request: RequestEntity
  ): Promise<string> {
    const baseAmount =
      typeof amount === 'number' ? amount : parseFloat(amount as any);
    if (isNaN(baseAmount)) {
      throw new BadRequestException('Invalid amount for PayPal deposit');
    }

    const depositAmount = parseFloat((baseAmount * 0.5).toFixed(2));

    if (depositAmount <= 0) {
      throw new BadRequestException('Deposit amount must be greater than 0');
    }

    const accessToken = await this.getAccessToken();

    try {
      const orderData = {
        intent: 'CAPTURE',
        purchase_units: [
          {
            amount: {
              currency_code: 'USD',
              value: depositAmount.toFixed(2),
            },
            description: `50% Deposit for request ID ${request.id}`,
          },
        ],
        application_context: {
          return_url: this.buildUrl('paypal-success'),
          cancel_url: this.buildUrl('paypal/cancel'),
          brand_name: 'HereToTranslate',
          user_action: 'PAY_NOW',
        },
      };

      console.log('🔄 Creating PayPal order with data:', JSON.stringify(orderData, null, 2));

      const { data } = await axios.post(
        `${this.api}/v2/checkout/orders`,
        orderData,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        }
      );

      const approvalUrl = data.links?.find(
        (link: { rel: string }) => link.rel === 'approve'
      )?.href;

      if (!approvalUrl) {
        throw new InternalServerErrorException(
          'No approval URL returned by PayPal.'
        );
      }

      logger.log('🔄 Creating requester transaction in createDeposit:', {
        userId: user.id,
        userEmail: user.email,
        requestId: request.id,
        requestDescription: request.description,
        amount: depositAmount,
        paypalOrderId: data.id,
      });

      console.log('🔄 About to save requester transaction to database:', {
        userId: user.id,
        userEmail: user.email,
        requestId: request.id,
        amount: depositAmount,
        status: TransactionStatus.Pending,
        paypalOrderId: data.id,
      });

      const requesterTransaction = await this.transactionRepo.save({
        user,
        request,
        amount: depositAmount,
        status: TransactionStatus.Pending,
        type: TransactionType.DEPOSIT,
        paypalOrderId: data.id,
      });

      // AUDIT: Confirm a DEPOSIT transaction was created
      console.log('[AUDIT] Deposit transaction created', {
        id: requesterTransaction.id,
        userId: requesterTransaction.user?.id,
        requestId: requesterTransaction.request?.id,
        amount: requesterTransaction.amount,
        status: requesterTransaction.status,
        type: requesterTransaction.type,
        paypalOrderId: requesterTransaction.paypalOrderId,
        createdAt: requesterTransaction.createdAt,
      });

      console.log('✅ Successfully saved requester transaction to database:', {
        id: requesterTransaction.id,
        userId: requesterTransaction.user?.id,
        requestId: requesterTransaction.request?.id,
        amount: requesterTransaction.amount,
        status: requesterTransaction.status,
        paypalOrderId: requesterTransaction.paypalOrderId,
        userEmail: requesterTransaction.user?.email,
        requestDescription: requesterTransaction.request?.description,
        createdAt: requesterTransaction.createdAt,
      });

      logger.log('✅ Created requester transaction in createDeposit:', {
        id: requesterTransaction.id,
        userId: requesterTransaction.user?.id,
        requestId: requesterTransaction.request?.id,
        amount: requesterTransaction.amount,
        status: requesterTransaction.status,
        paypalOrderId: requesterTransaction.paypalOrderId,
        userEmail: requesterTransaction.user?.email,
        requestDescription: requesterTransaction.request?.description,
        type: 'Deposit',
      });

      return approvalUrl;
    } catch (err) {
      if (axios.isAxiosError(err)) {
        console.error('❌ PayPal API error in createDeposit:', {
          status: err.response?.status,
          statusText: err.response?.statusText,
          data: err.response?.data,
          message: err.message,
          url: err.config?.url,
        });

        if (err.response?.status === 422) {
          const errorDetails = err.response?.data?.details?.[0];
          const errorMessage = errorDetails?.issue || err.response?.data?.message || 'PayPal order validation failed';
          throw new BadRequestException(`PayPal order creation failed: ${errorMessage}`);
        }

        if (err.response?.status === 400) {
          throw new BadRequestException('Invalid PayPal order data. Please check the request parameters.');
        }

        if (err.response?.status && err.response.status >= 500) {
          throw new InternalServerErrorException('PayPal service temporarily unavailable. Please try again later.');
        }
      } else {
        console.error('❌ Unexpected error during PayPal order creation:', err);
      }

      throw new InternalServerErrorException('Failed to create PayPal deposit. Please try again.');
    }
  }

  async createPrivateDeposit(
    amount: number,
    user: UserEntity,
    request: RequestEntity
  ): Promise<string> {
    const baseAmount =
      typeof amount === 'number' ? amount : parseFloat(amount as any);
    if (isNaN(baseAmount)) {
      throw new BadRequestException('Invalid amount for PayPal deposit');
    }

    const depositAmount = parseFloat((baseAmount * 0.5).toFixed(2));

    if (depositAmount <= 0) {
      throw new BadRequestException('Deposit amount must be greater than 0');
    }

    const accessToken = await this.getAccessToken();

    try {
      const orderData = {
        intent: 'CAPTURE',
        purchase_units: [
          {
            amount: {
              currency_code: 'USD',
              value: depositAmount.toFixed(2),
            },
            description: `50% Deposit (5% fee included) for request ID ${request.id}`,
          },
        ],
        application_context: {
          return_url: this.buildUrl('paypal-success'),
          cancel_url: this.buildUrl('paypal/cancel'),
        },
      };

      console.log('🔄 Creating private PayPal order with data:', JSON.stringify(orderData, null, 2));

      const { data } = await axios.post(
        `${this.api}/v2/checkout/orders`,
        orderData,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          timeout: 15000,
        }
      );

      const approvalUrl = data.links?.find(
        (link: { rel: string }) => link.rel === 'approve'
      )?.href;

      if (!approvalUrl) {
        throw new InternalServerErrorException(
          'No approval URL returned by PayPal.'
        );
      }

      console.log(
        '🔄 About to save requester transaction in createPrivateDeposit:',
        {
          userId: user.id,
          userEmail: user.email,
          requestId: request.id,
          amount: depositAmount,
          status: TransactionStatus.Pending,
          paypalOrderId: data.id,
        }
      );

      // Create transaction for requester (who is paying) - positive amount (deposit)
      const requesterTransaction = await this.transactionRepo.save({
        user,
        request,
        amount: depositAmount,
        status: TransactionStatus.Pending,
        type: TransactionType.DEPOSIT,
        paypalOrderId: data.id,
      });

      // NOTE: Assignee gets NO transaction - money is held in the request
      // Assignee will only get a transaction when project is completed

      console.log(
        '✅ Successfully saved requester transaction in createPrivateDeposit:',
        {
          requesterTransaction: {
            id: requesterTransaction.id,
            userId: requesterTransaction.user?.id,
            amount: requesterTransaction.amount,
            status: requesterTransaction.status,
            type: requesterTransaction.type,
          },
          paypalOrderId: data.id,
          note: 'Assignee gets NO transaction - money is held in request until project completion'
        }
      );

      return approvalUrl;
    } catch (err) {
      if (axios.isAxiosError(err)) {
        console.error('❌ PayPal API error in createPrivateDeposit:', {
          status: err.response?.status,
          statusText: err.response?.statusText,
          data: err.response?.data,
          message: err.message,
          url: err.config?.url,
        });

        if (err.response?.status === 422) {
          const errorDetails = err.response?.data?.details?.[0];
          const errorMessage = errorDetails?.issue || err.response?.data?.message || 'PayPal order validation failed';
          throw new BadRequestException(`PayPal order creation failed: ${errorMessage}`);
        }

        if (err.response?.status === 400) {
          throw new BadRequestException('Invalid PayPal order data. Please check the request parameters.');
        }

        if (err.response?.status && err.response.status >= 500) {
          throw new InternalServerErrorException('PayPal service temporarily unavailable. Please try again later.');
        }
      } else {
        console.error('❌ Unexpected error during PayPal order creation:', err);
      }

      throw new InternalServerErrorException('Failed to create PayPal deposit. Please try again.');
    }
  }

  async capturePaymentAndCreateProject(orderId: string) {
    console.log('[DEBUG] ===> ĐÃ VÀO capturePaymentAndCreateProject', {
      orderId,
      time: new Date().toISOString(),
    });
    console.log('[DEBUG] ===> BẮT ĐẦU XỬ LÝ PAYMENT CAPTURE');
    const accessToken = await this.getAccessToken();

    try {
      const captureRes = await axios.post(
        `${this.api}/v2/checkout/orders/${orderId}/capture`,
        {},
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (captureRes.status !== 201) {
        throw new Error(
          'Payment capture failed with status: ' + captureRes.status
        );
      }

      console.log('🔄 Finding transaction for orderId:', orderId);

      const transaction = await this.transactionRepo.findOneOrFail({
        where: { paypalOrderId: orderId },
        relations: [
          'user',
          'request',
          'request.registrants',
          'request.category',
          'request.files',
        ],
      });

      console.log('✅ Found original transaction:', {
        id: transaction.id,
        userId: transaction.user?.id,
        userEmail: transaction.user?.email,
        requestId: transaction.request?.id,
        amount: transaction.amount,
        status: transaction.status,
        type: transaction.type,
        registrantsCount: transaction.request?.registrants?.length || 0,
      });

      const { user: payerUser, request } = transaction;

      console.log('[DEBUG] ===> REQUEST INFO:', {
        requestId: request.id,
        isPublic: request.isPublic,
        status: request.status,
        assigneeId: request.assignee?.id,
        registrantsCount: request.registrants?.length || 0,
        payerUserId: payerUser.id,
        payerUserEmail: payerUser.email,
      });

      console.log('🔄 Finding translator from registrants:', {
        registrants: request.registrants?.map((r) => ({
          id: r.id,
          email: r.email,
        })),
        payerUserId: payerUser.id,
        payerUserEmail: payerUser.email,
      });

      // Xử lý cả public và private request
      let translator = null;

      if (request.isPublic) {
        // Public request - tìm translator từ registrants
        translator = request.registrants.find(
          (registrant) => registrant.id !== payerUser.id
        );

        if (!translator) {
          console.error('❌ No translator found in registrants');
          throw new Error('No translator found in registrants');
        }
      } else {
        // Private request - translator đã được assign sẵn
        translator = request.assignee;

        console.log('[DEBUG] ===> PRIVATE REQUEST - ASSIGNEE FOUND:', {
          assigneeId: translator?.id,
          assigneeEmail: translator?.email,
        });

        if (!translator) {
          console.error('❌ No assignee found for private request');
          throw new Error('No assignee found for private request');
        }
      }

      console.log('✅ Found translator:', {
        id: translator.id,
        email: translator.email,
      });

      const otherUserIds = request.registrants
        .map((user) => Number(user.id))
        .filter((uid) => uid !== Number(translator.id));

      const queryRunner = this.projectService['dataSource'].createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        const createResult = await this.projectService.createProjectFromRequest(
          request,
          translator.id
        );

        const newProject = await this.projectRepository.findOneOrFail({
          where: { id: createResult.projectId },
        });

        request.assignee = translator;
        request.registrants = [];
        request.project = newProject;
        request.status = RequestStatus.Approved;
        transaction.status = TransactionStatus.On_Hold;

        // NOTE: Only requester gets a transaction - money is held in the request
        // Translator will only get a transaction when project is completed

        // Get payer's wallet to access paypalEmail
        const payerWallet = await this.walletManagerService.getOrCreateWallet(
          payerUser.id
        );

        console.log('🔄 Updating requester transaction status to ON_HOLD:', {
          userId: payerUser.id,
          userEmail: payerUser.email,
          amount: Math.abs(transaction.amount),
          requestId: request.id,
        });

        // AUDIT: Before updating to ON_HOLD
        console.log('[AUDIT] Before set ON_HOLD', {
          id: transaction.id,
          status: transaction.status,
          type: transaction.type,
          paypalOrderId: transaction.paypalOrderId,
        });

        transaction.status = TransactionStatus.On_Hold;
        transaction.paypalEmail = payerWallet?.paypalEmail ?? '';

        console.log('✅ Updated requester transaction to ON_HOLD:', {
          id: transaction.id,
          userId: transaction.user?.id,
          userEmail: transaction.user?.email,
          requestId: transaction.request?.id,
          amount: transaction.amount,
          status: transaction.status,
          type: transaction.type,
          note: 'Money is held in request until project completion'
        });

        // AUDIT: After updating to ON_HOLD
        console.log('[AUDIT] After set ON_HOLD', {
          id: transaction.id,
          status: transaction.status,
          type: transaction.type,
          paypalOrderId: transaction.paypalOrderId,
        });

        // Manifest extraction for copied files is now enqueued in background
        // inside createProjectFromRequest. Nothing to do here.

        console.log('🔄 Saving request and updated transaction to database...');
        await queryRunner.manager.save([
          request,
          transaction,
        ]);
        console.log('✅ Successfully saved request and transaction to database');

        console.log(
          '✅ Updated transaction in capturePaymentAndCreateProject:',
          {
            originalTransaction: {
              id: transaction.id,
              userId: transaction.user?.id,
              userEmail: transaction.user?.email,
              amount: transaction.amount,
              status: transaction.status,
              note: 'Money is held in request until project completion'
            },
          }
        );

        if (otherUserIds.length > 0) {
          await this.mailService.notifyAllOthersRequestTaken(
            Number(request.id),
            otherUserIds
          );
        }

        const adminWallet = await this.walletManagerService.getOrCreateWallet(
          this.ADMIN_USER_ID
        );

        console.log('[DEBUG] ===> ADMIN WALLET BEFORE UPDATE:', {
          adminUserId: this.ADMIN_USER_ID,
          oldBalance: adminWallet.balance,
          transactionAmount: transaction.amount,
          newBalance: Number(adminWallet.balance) + Number(transaction.amount),
        });

        adminWallet.balance =
          Number(adminWallet.balance) + Number(transaction.amount);
        await queryRunner.manager.save(adminWallet);

        console.log('[DEBUG] ===> ADMIN WALLET AFTER UPDATE:', {
          adminUserId: this.ADMIN_USER_ID,
          newBalance: adminWallet.balance,
        });

        await queryRunner.commitTransaction();

        return {
          success: true,
          projectId: newProject.id,
          requestId: request.id,
          amount: transaction.amount,
          currency: 'USD',
          payerEmail: transaction.user?.email,
          receiver: request.assignee?.fullName || request.assignee?.email,
          date: transaction.createdAt,
          description: request.description,
        };
      } catch (err) {
        await queryRunner.rollbackTransaction();
        console.error('Project creation failed:', err);
        return {
          success: false,
          error: (err as any)?.message || 'Project creation failed',
        };
      } finally {
        await queryRunner.release();
      }
    } catch (err) {
      console.error('PayPal capture failed:', err);
      return {
        success: false,
        error: (err as any)?.message || 'PayPal capture failed',
      };
    }
  }

  async capturePayment(orderId: string) {
    console.log('[DEBUG] ===> ĐÃ VÀO capturePayment', {
      orderId,
      time: new Date().toISOString(),
    });

    // Thêm log call stack để debug
    console.log('[DEBUG] ===> CAPTURE PAYMENT - CALL STACK:', new Error().stack);

    const accessToken = await this.getAccessToken();

    try {
      const captureRes = await axios.post(
        `${this.api}/v2/checkout/orders/${orderId}/capture`,
        {},
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (captureRes.status !== 201) {
        throw new Error(
          'Payment capture failed with status: ' + captureRes.status
        );
      }

      const transaction = await this.transactionRepo.findOneOrFail({
        where: { paypalOrderId: orderId },
        relations: [
          'user',
          'request',
          'request.requester', // Đúng trường requester
          'request.assignee', // Thêm assignee relation
          'request.registrants',
          'request.category',
          'request.files',
        ],
      });
      const user = transaction.user;
      let request = transaction.request;
      if (request.isPublic && !request.category) {
        request = await this.requestRepository.findOneOrFail({
          where: { id: request.id },
          relations: ['category'],
        });
      }

      if (!request || !user) {
        throw new Error('Invalid request or user information.');
      }

      // Kiểm tra requester wallet trước khi xử lý
      const requesterWalletBefore = await this.walletManagerService.getOrCreateWallet(user.id);
      console.log('[DEBUG] ===> CAPTURE PAYMENT - REQUESTER WALLET BEFORE:', {
        requesterId: user.id,
        oldBalance: requesterWalletBefore.balance,
      });

      console.log('[DEBUG] ===> CAPTURE PAYMENT - REQUEST INFO:', {
        requestId: request.id,
        isPublic: request.isPublic,
        status: request.status,
        assigneeId: request.assignee?.id,
        userId: user.id,
        userEmail: user.email,
        transactionAmount: transaction.amount,
      });

      transaction.status = TransactionStatus.On_Hold;


      const translatorTransaction = null;


      await this.transactionRepo.save(transaction);
      if (translatorTransaction) {
        await this.transactionRepo.save(translatorTransaction);
      }

      let projectId = null;
      let receiver = null;
      if (request.isPublic && request.status !== RequestStatus.Approved) {
        if (!request.category?.id) {
          console.error(
            '[PayPal] Request public thiếu category khi tạo project:',
            request
          );
          return {
            success: false,
            error: 'Request public không có category, không thể tạo project',
            requestId: request.id,
            amount: transaction.amount,
            payerEmail: user.email,
            date: transaction.createdAt,
            description: request.description,
          };
        }
        request.status = RequestStatus.Approved;
        // Tạo project mới từ request public
        if (!request.project) {
          try {
            // KHÔNG gán lại assignee - giữ nguyên assignee đã được gán từ approveRegistrant
            // request.assignee đã được set đúng từ approveRegistrant
            console.log('[DEBUG] ===> CAPTURE PAYMENT - Creating project with existing assignee:', {
              requestId: request.id,
              existingAssigneeId: request.assignee?.id,
              existingAssigneeEmail: request.assignee?.email,
              requesterId: user.id,
              requesterEmail: user.email
            });

            // Gọi service tạo project từ request với assignee hiện tại
            const createResult =
              await this.projectService.createProjectFromRequest(
                request,
                request.assignee?.id || user.id // Ưu tiên assignee, fallback về user nếu không có
              );
            const newProject = await this.projectRepository.findOneOrFail({
              where: { id: createResult.projectId },
            });
            request.project = newProject;
            projectId = newProject.id;
            receiver = request.assignee?.fullName || request.assignee?.email;
          } catch (err) {
            console.error(
              '[PayPal] Error creating project from public request:',
              err
            );
            return {
              success: false,
              error: 'Payment succeeded but failed to create project: ' + err,
              requestId: request.id,
              amount: transaction.amount,
              payerEmail: user.email,
              date: transaction.createdAt,
              description: request.description,
            };
          }
        } else {
          projectId = request.project.id;
          receiver = request.assignee?.fullName || request.assignee?.email;
        }
        await this.requestRepository.save(request);
      } else if (!request.isPublic) {
        // Xử lý private request - chỉ cập nhật trạng thái transaction
        // Private request không cần tạo project ở đây, chỉ cần hold tiền
        console.log(
          `[PayPal] Private request payment captured - money held in admin wallet for request ID ${request.id}`
        );
        receiver = request.assignee?.fullName || request.assignee?.email;
      }

      const adminWallet = await this.walletManagerService.getOrCreateWallet(
        this.ADMIN_USER_ID
      );

      console.log('[DEBUG] ===> CAPTURE PAYMENT - ADMIN WALLET BEFORE UPDATE:', {
        adminUserId: this.ADMIN_USER_ID,
        oldBalance: adminWallet.balance,
        transactionAmount: transaction.amount,
        newBalance: Number(adminWallet.balance) + Number(transaction.amount),
      });

      adminWallet.balance =
        Number(adminWallet.balance) + Number(transaction.amount);
      await this.walletRepository.save(adminWallet);

      console.log('[DEBUG] ===> CAPTURE PAYMENT - ADMIN WALLET AFTER UPDATE:', {
        adminUserId: this.ADMIN_USER_ID,
        newBalance: adminWallet.balance,
      });

      // Kiểm tra requester wallet sau khi xử lý xong
      const requesterWalletAfter = await this.walletManagerService.getOrCreateWallet(user.id);
      console.log('[DEBUG] ===> CAPTURE PAYMENT - REQUESTER WALLET AFTER:', {
        requesterId: user.id,
        newBalance: requesterWalletAfter.balance,
        balanceChanged: requesterWalletAfter.balance !== requesterWalletBefore.balance,
        balanceDifference: Number(requesterWalletAfter.balance) - Number(requesterWalletBefore.balance),
      });

      logger.log(
        `[PayPal] Payment captured for order ${orderId}, request ID ${request.id}, user ID ${user.id}, projectId: ${projectId}`
      );

      // Log cuối cùng trước khi return
      console.log('[DEBUG] ===> CAPTURE PAYMENT - RETURNING SUCCESS:', {
        requestId: request.id,
        isPublic: request.isPublic,
        adminWalletBalance: adminWallet.balance,
        requesterWalletBalance: requesterWalletAfter.balance,
      });

      return {
        success: true,
        requestId: request.id,
        projectId,
        amount: transaction.amount,
        currency: 'USD',
        payerEmail: user.email,
        receiver,
        date: transaction.createdAt,
        description: request.description,
      };
    } catch (err) {
      console.error('[PayPal] capturePayment failed:', err);
      return {
        success: false,
        error: (err as any)?.message || 'PayPal capture failed',
      };
    }
  }

  async withdraw(userId: bigint, dto: WithdrawDto): Promise<TransactionEntity> {
    const { amount, paypalEmail, requestId, paypalOrderId } = dto;

    if (amount <= 0) {
      throw new BadRequestException('Amount must be positive');
    }

    if (!paypalEmail || !paypalEmail.includes('@')) {
      throw new BadRequestException('Invalid PayPal email address');
    }

    const userEntity = await this.userRepository.findOneOrFail({
      where: { id: userId },
    });

    // Check if user has enough balance - use dynamic balance calculation
    const userWallet = await this.walletManagerService.getOrCreateWallet(userId);
    const walletDetails = await this.walletManagerService.getWalletDetails(userId);

    // Compute available balance excluding hold and pending amounts
    const availableBalance = Number(walletDetails.balance) - Number(walletDetails.holdAmount || 0) - Number(walletDetails.pendingWithdrawals || 0);

    // Debug: log balance values and types including available balance
    console.log('Withdraw - Balance check:', {
      userId,
      requestedAmount: amount,
      requestedAmountType: typeof amount,
      staticWalletBalance: userWallet.balance,
      dynamicBalance: walletDetails.balance,
      availableBalance,
      totalDeposits: walletDetails.totalDeposits,
      totalWithdrawn: walletDetails.totalWithdrawn,
      pendingWithdrawals: walletDetails.pendingWithdrawals,
      holdAmount: walletDetails.holdAmount,
      comparisonAvailable: availableBalance < amount
    });

    if (availableBalance < amount) {
      throw new BadRequestException(
        `Insufficient available balance. Available: $${availableBalance} (Total: $${walletDetails.balance}, On hold: $${walletDetails.holdAmount || 0}, Pending: $${walletDetails.pendingWithdrawals || 0}). Requested: $${amount}`
      );
    }

    let request: RequestEntity | undefined = undefined;
    if (requestId) {
      request = await this.requestRepository.findOneOrFail({
        where: { id: requestId },
      });
    }

    // Debug: log giá trị paypalEmail khi tạo transaction
    console.log('Withdraw - paypalEmail:', paypalEmail, 'DTO:', dto);

    try {
      // Process PayPal payout directly
      const payoutResult = await this.processPayPalPayout(paypalEmail, amount, userId);

      if (!payoutResult.success) {
        throw new BadRequestException(`PayPal payout failed: ${payoutResult.error}`);
      }

      // Create completed transaction
      const transactionPayload: DeepPartial<TransactionEntity> = {
        user: userEntity,
        amount: -Math.abs(amount),
        status: TransactionStatus.Completed,
        type: TransactionType.WITHDRAWAL,
        paypalOrderId: paypalOrderId ?? undefined,
        request,
        paypalEmail,
      };

      const transaction = this.transactionRepo.create(transactionPayload);
      await this.transactionRepo.save(transaction);

      // Update user wallet balance
      userWallet.balance = Number(userWallet.balance) - amount;
      await this.walletRepository.save(userWallet);

      // Update admin wallet (receive the withdrawn amount)
      const adminWallet = await this.walletManagerService.getOrCreateWallet(this.ADMIN_USER_ID);
      adminWallet.balance = Number(adminWallet.balance) + amount;
      await this.walletRepository.save(adminWallet);

      // Create notification for user about successful withdrawal
      await this.notificationService.createNotification({
        userId: userId,
        type: 'WITHDRAWAL_COMPLETED',
        message: `Your withdrawal of $${amount} has been processed successfully via PayPal.`,
        createdBy: userId,
      });

      // Debug: log transaction sau khi lưu
      console.log('Saved completed withdrawal transaction:', transaction);

      return transaction;

    } catch (error) {
      console.error('Withdrawal failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      throw new BadRequestException(`Withdrawal failed: ${errorMessage}`);
    }
  }

  private async processPayPalPayout(paypalEmail: string, amount: number, userId: bigint) {
    try {
      // Use the existing getAccessToken method to avoid URL issues
      const accessToken = await this.getAccessToken();
      console.log('[PayPal] Processing direct payout with access token:', accessToken.slice(0, 12) + '...');
      console.log('[PayPal] Payout endpoint:', `${this.api}/v1/payments/payouts`);
      console.log('[PayPal] Payout to email:', paypalEmail, 'Amount:', amount);

      const payoutData = {
        sender_batch_header: {
          sender_batch_id: `user_withdrawal_${userId}_${Date.now()}`,
          email_subject: 'Your withdrawal has been processed!',
          email_message: 'You have received your withdrawal via PayPal.',
        },
        items: [
          {
            recipient_type: 'EMAIL',
            amount: {
              value: amount.toFixed(2),
              currency: 'USD',
            },
            note: 'Direct withdrawal processed.',
            receiver: paypalEmail,
            sender_item_id: `withdrawal_${userId}_${Date.now()}`,
          },
        ],
      };

      const res = await axios.post(
        `${this.api}/v1/payments/payouts`,
        payoutData,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (res.status !== 201) {
        throw new Error('PayPal payout failed with status: ' + res.status);
      }

      console.log('[PayPal] Direct payout successful:', res.data);
      return { success: true, payoutId: res.data.batch_header.payout_batch_id };

    } catch (err) {
      console.error('PayPal direct payout failed:', err);
      if (axios.isAxiosError(err)) {
        const errorMessage = err.response?.data?.message || err.message;
        return { success: false, error: `PayPal API error: ${errorMessage}` };
      }
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      return { success: false, error: errorMessage };
    }
  }

  async approveWithdrawal(transactionId: number): Promise<TransactionEntity> {
    // Note: This method is now mainly for handling legacy pending withdrawal requests
    // since users can now withdraw directly. It may be deprecated in the future.
    const transaction = await this.transactionRepo.findOneOrFail({
      where: { id: transactionId },
      relations: ['user', 'request', 'request.assignee'],
    });

    if (transaction.status !== TransactionStatus.Pending) {
      throw new BadRequestException('Transaction is not pending approval.');
    }

    // Get user's wallet to access paypalEmail
    const userWallet = await this.walletManagerService.getOrCreateWallet(
      transaction.user.id
    );
    const paypalEmail = userWallet.paypalEmail || transaction.user.email;
    const amount = Math.abs(Number(transaction.amount));

    // Use the existing getAccessToken method to avoid URL issues
    const accessToken = await this.getAccessToken();
    console.log('[PayPal] Access token:', accessToken.slice(0, 12) + '...');
    console.log(
      '[PayPal] Payout endpoint:',
      `${this.api}/v1/payments/payouts`
    );
    console.log('[PayPal] Payout to email:', paypalEmail);

    const payoutData = {
      sender_batch_header: {
        sender_batch_id: `admin_payout_${Date.now()}`,
        email_subject: 'Your withdrawal has been approved!',
        email_message: 'You have received your payout via PayPal.',
      },
      items: [
        {
          recipient_type: 'EMAIL',
          amount: {
            value: amount.toFixed(2),
            currency: 'USD',
          },
          note: 'Withdrawal approved .',
          receiver: paypalEmail,
          sender_item_id: `txn_${transactionId}_${Date.now()}`,
        },
      ],
    };

    try {
      const res = await axios.post(
        `${this.api}/v1/payments/payouts`,
        payoutData,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (res.status !== 201) {
        throw new Error('PayPal payout failed with status: ' + res.status);
      }

      transaction.status = TransactionStatus.Completed;
      await this.transactionRepo.save(transaction);

      const adminWallet = await this.walletManagerService.getOrCreateWallet(
        this.ADMIN_USER_ID
      );
      adminWallet.balance =
        Number(adminWallet.balance) + Number(transaction.amount);
      await this.walletRepository.save(adminWallet);

      logger.log(
        `PayPal payout approved for transaction ID ${transactionId}, amount: ${amount}`
      );

      // Create notification for user about approved withdrawal
      await this.notificationService.createNotification({
        userId: transaction.user.id,
        type: 'WITHDRAWAL_APPROVED',
        message: `Your withdrawal request for $${amount} has been approved and processed via PayPal.`,
        createdBy: this.ADMIN_USER_ID,
      });

      return transaction;
    } catch (err) {
      console.error('PayPal payout failed:', err);
      throw new InternalServerErrorException(
        'Failed to approve PayPal withdrawal'
      );
    }
  }

  async getAllPendingWithdrawals() {
    // Since users can now withdraw directly, this method now returns all withdrawal history
    // for admin monitoring purposes
    const txns = await this.transactionRepo
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.user', 'user')
      .where('t.amount < 0')
      .orderBy('t.createdAt', 'DESC')
      .getMany();
    return txns.map((txn) => ({
      ...txn,
      createdAt:
        txn.createdAt instanceof Date
          ? txn.createdAt.toISOString()
          : txn.createdAt,
    }));
  }

  async finalizeTranslation(requestId: bigint): Promise<boolean> {
    const request = await this.requestRepository.findOneOrFail({
      where: { id: requestId },
      relations: ['assignee', 'requester'],
    });

    if (!request.assignee || !request.requester) {
      throw new BadRequestException(
        'Request must have both requester and assignee.'
      );
    }

    await this.approveTranslation(requestId, request.requester.id);
    await this.approveTranslation(requestId, request.assignee.id);

    const [requesterApproval, assigneeApproval] = await Promise.all([
      this.translationApprovalRepository.findOne({
        where: {
          request: { id: requestId },
          user: { id: request.requester.id },
        },
      }),
      this.translationApprovalRepository.findOne({
        where: {
          request: { id: requestId },
          user: { id: request.assignee.id },
        },
      }),
    ]);

    if (!requesterApproval?.isApproved || !assigneeApproval?.isApproved) {
      throw new BadRequestException(
        'Both parties must approve before finalizing.'
      );
    }

    const transaction = await this.transactionRepo.findOneOrFail({
      where: { request: { id: requestId } },
      relations: ['request', 'user'],
    });

    if (
      transaction.status !== TransactionStatus.Pending &&
      transaction.status !== TransactionStatus.Approved
    ) {
      throw new BadRequestException(
        'Transaction already finalized or in invalid state.'
      );
    }

    transaction.status = TransactionStatus.Approved;
    await this.transactionRepo.save(transaction);

    const feePercentage = await this.feeService.getDefaultFee();
    const feeAmount = Number(transaction.amount) * (feePercentage / 100);
    const payoutAmount = Number(transaction.amount) - feeAmount;

    await this.walletManagerService.addToBalance(
      request.assignee.id,
      payoutAmount
    );

    const adminWallet = await this.walletManagerService.getOrCreateWallet(
      this.ADMIN_USER_ID
    );
    adminWallet.balance += feeAmount;
    await this.walletRepository.save(adminWallet);

    await this.transactionRepo.save({
      user: await this.userRepository.findOneByOrFail({
        id: this.ADMIN_USER_ID,
      }),
      request,
      amount: feeAmount,
      status: TransactionStatus.Completed,
    });

    request.status = RequestStatus.Completed;
    await this.requestRepository.save(request);

    return true;
  }

  async approveTranslation(
    requestId: bigint,
    userId: bigint
  ): Promise<boolean> {
    const request = await this.requestRepository.findOneOrFail({
      where: { id: requestId },
      relations: ['assignee', 'requester'],
    });

    if (!request.assignee || !request.requester) {
      throw new BadRequestException(
        'Request must have both requester and assignee.'
      );
    }

    if (userId !== request.assignee.id && userId !== request.requester.id) {
      throw new BadRequestException(
        'Only requester or assignee can approve the translation.'
      );
    }

    // Check if approval already exists
    let approval = await this.translationApprovalRepository.findOne({
      where: {
        request: { id: requestId },
        user: { id: userId },
      },
    });

    if (!approval) {
      approval = this.translationApprovalRepository.create({
        request: { id: requestId },
        user: { id: userId },
        isApproved: true,
      });
    } else {
      approval.isApproved = true;
    }

    await this.translationApprovalRepository.save(approval);
    return true;
  }

  async payFinal50Percent(requestId: bigint) {
    const request = await this.requestRepository.findOneOrFail({
      where: { id: requestId },
      relations: ['requester', 'assignee'],
    });

    if (!request.assignee) {
      throw new BadRequestException('Request must have an assignee.');
    }

    // Check if final payment has already been processed
    const existingFinalPayment = await this.transactionRepo.findOne({
      where: {
        request: { id: requestId },
        user: { id: request.assignee.id },
        type: TransactionType.PAYMENT,
        status: TransactionStatus.Completed,
      },
    });

    if (existingFinalPayment) {
      console.log(`Final payment already processed for request ${requestId}, skipping payFinal50Percent`);
      return;
    }

    const approvals = await this.translationApprovalRepository.find({
      where: { request: { id: requestId } },
    });

    const bothApproved = approvals.find(a => a.user.id === request.requester.id && a.isApproved)
      && approvals.find(a => a.user.id === request.assignee.id && a.isApproved);

    if (!bothApproved) {
      throw new BadRequestException('Translation not yet approved by both parties.');
    }

    const originalTx = await this.transactionRepo.findOneOrFail({
      where: { request: { id: requestId } },
      relations: ['user'],
    });

    const remainingAmount = originalTx.amount;

    // Credit the translator's wallet with the final 50% payment
    const translatorWallet = await this.walletManagerService.getOrCreateWallet(request.assignee.id);
    translatorWallet.balance = Number(translatorWallet.balance) + remainingAmount;
    await this.walletRepository.save(translatorWallet);

    // Create transaction record for the translator
    const tx = this.transactionRepo.create({
      user: { id: request.assignee.id },
      request: { id: request.id },
      amount: remainingAmount,
      status: TransactionStatus.Completed,
      type: TransactionType.PAYMENT,
    });

    await this.transactionRepo.save(tx);
  }

  async refundDeposit(request: RequestEntity): Promise<void> {
    logger.log(`Starting refund process for request ID: ${request.id}`);

    // Find the original deposit transaction (prefer ON_HOLD; fallback to PENDING/WAITING_APPROVAL)
    let depositTransaction = await this.transactionRepo.findOne({
      where: {
        request: { id: request.id },
        user: { id: request.requester.id },
        status: TransactionStatus.On_Hold,
        type: TransactionType.DEPOSIT,
      },
      relations: ['user'],
    });

    if (!depositTransaction) {
      depositTransaction = await this.transactionRepo.findOne({
        where: [
          {
            request: { id: request.id },
            user: { id: request.requester.id },
            status: TransactionStatus.Pending,
            type: TransactionType.DEPOSIT,
          },
          {
            request: { id: request.id },
            user: { id: request.requester.id },
            status: TransactionStatus.WaitingApproval,
            type: TransactionType.DEPOSIT,
          },
        ],
        relations: ['user'],
        order: { id: 'DESC' },
      });
    }

    if (!depositTransaction) {
      // Try to find any historical DEPOSIT transaction to get exact deposit amount
      const anyDepositTx = await this.transactionRepo.findOne({
        where: {
          request: { id: request.id },
          user: { id: request.requester.id },
          type: TransactionType.DEPOSIT,
        },
        order: { id: 'DESC' },
      });

      // Fallback: refund 100% of the actual deposited amount if found; otherwise 50% of dealAmount
      logger.warn(`No pending deposit transaction found for request ID: ${request.id}`);
      try {
        const derivedAmount = anyDepositTx ? Number(anyDepositTx.amount) : Number(request.dealAmount) * 0.5;
        const amount = Math.abs(derivedAmount);

        // Decrease admin wallet (release held funds logically)
        const adminWallet = await this.walletManagerService.getOrCreateWallet(this.ADMIN_USER_ID);
        adminWallet.balance = Number(adminWallet.balance) - amount;
        await this.walletRepository.save(adminWallet);

        // Credit requester wallet
        const requesterWallet = await this.walletManagerService.getOrCreateWallet(request.requester.id);
        requesterWallet.balance = Number(requesterWallet.balance) + amount;
        await this.walletRepository.save(requesterWallet);

        // Create explicit REFUND transaction record for requester
        const refundTransaction = this.transactionRepo.create({
          user: { id: request.requester.id } as UserEntity,
          request: { id: request.id } as RequestEntity,
          amount: amount as any,
          status: TransactionStatus.Completed,
          type: TransactionType.REFUND,
        });
        await this.transactionRepo.save(refundTransaction);

        await this.notificationService.createNotification({
          userId: request.requester.id,
          type: 'REFUND_PROCESSED',
          message: `Your deposit of $${amount} has been refunded for request "${request.title}".`,
          createdBy: this.ADMIN_USER_ID,
        });

        // Ensure any lingering DEPOSIT entries for this request are marked as Failed
        await this.transactionRepo
          .createQueryBuilder()
          .update(TransactionEntity)
          .set({ status: TransactionStatus.Failed })
          .where(
            'requestId = :rid AND userId = :uid AND type = :type AND status IN (:...statuses)',
            {
              rid: request.id,
              uid: request.requester.id,
              type: TransactionType.DEPOSIT,
              statuses: [
                TransactionStatus.On_Hold,
                TransactionStatus.Pending,
                TransactionStatus.WaitingApproval,
              ],
            },
          )
          .execute();

        logger.log(`Fallback refund processed: $${amount} to requester ID ${request.requester.id} for request ID ${request.id}`);
      } catch (error) {
        logger.error(`Fallback refund failed for request ID ${request.id}: ${error}`);
        throw new InternalServerErrorException('Failed to process refund');
      }
      return;
    }

    try {
      // Decrease admin wallet (release held deposit if it was ON_HOLD)
      const adminWallet = await this.walletManagerService.getOrCreateWallet(this.ADMIN_USER_ID);
      const amount = Math.abs(Number(depositTransaction.amount));
      adminWallet.balance = Number(adminWallet.balance) - amount;
      await this.walletRepository.save(adminWallet);

      // Credit requester wallet
      const requesterWallet = await this.walletManagerService.getOrCreateWallet(request.requester.id);
      requesterWallet.balance = Number(requesterWallet.balance) + amount;
      await this.walletRepository.save(requesterWallet);

      // Mark original deposit as failed/cancelled
      depositTransaction.status = TransactionStatus.Failed;
      await this.transactionRepo.save(depositTransaction);

      // Create explicit REFUND transaction record for requester
      const refundTransaction = this.transactionRepo.create({
        user: { id: request.requester.id } as UserEntity,
        request: { id: request.id } as RequestEntity,
        amount: amount,
        status: TransactionStatus.Completed,
        type: TransactionType.REFUND,
      });

      await this.transactionRepo.save(refundTransaction);

      // Additionally, ensure any other matching DEPOSIT entries are marked as Failed
      await this.transactionRepo
        .createQueryBuilder()
        .update(TransactionEntity)
        .set({ status: TransactionStatus.Failed })
        .where(
          'requestId = :rid AND userId = :uid AND type = :type AND status IN (:...statuses)',
          {
            rid: request.id,
            uid: request.requester.id,
            type: TransactionType.DEPOSIT,
            statuses: [
              TransactionStatus.On_Hold,
              TransactionStatus.Pending,
              TransactionStatus.WaitingApproval,
            ],
          },
        )
        .execute();

      await this.notificationService.createNotification({
        userId: request.requester.id,
        type: 'REFUND_PROCESSED',
        message: `Your deposit of $${depositTransaction.amount} has been refunded for request "${request.title}".`,
        createdBy: this.ADMIN_USER_ID,
      });

      logger.log(
        `Successfully refunded $${depositTransaction.amount} to user ID ${request.requester.id} for request ID ${request.id}`
      );
    } catch (error) {
      logger.error(`Failed to process refund for request ID ${request.id}: ${error}`);
      throw new InternalServerErrorException('Failed to process refund');
    }
  }

  // Pay held deposit to translator when requester cancels an approved project
  async payoutDepositToTranslator(request: RequestEntity): Promise<void> {
    // Debug wallets BEFORE payout
    try {
      const adminWBefore = await this.walletManagerService.getOrCreateWallet(this.ADMIN_USER_ID);
      const requesterWBefore = await this.walletManagerService.getOrCreateWallet(request.requester.id);
      const translatorWBefore = request.assignee?.id ? await this.walletManagerService.getOrCreateWallet(request.assignee.id) : undefined;
      console.log('[PAYOUT_DEPOSIT][BEFORE] Wallet balances:', {
        admin: Number(adminWBefore.balance),
        requesterId: request.requester.id?.toString?.(),
        requester: Number(requesterWBefore.balance),
        translatorId: request.assignee?.id?.toString?.(),
        translator: translatorWBefore ? Number(translatorWBefore.balance) : null,
      });
    } catch (e) {
      console.warn('[PAYOUT_DEPOSIT] Failed to fetch BEFORE wallet balances:', e);
    }
    // Find the original deposit (prefer ON_HOLD; fallback to PENDING/WAITING_APPROVAL)
    let depositTx = await this.transactionRepo.findOne({
      where: {
        request: { id: request.id },
        user: { id: request.requester.id },
        status: TransactionStatus.On_Hold,
        type: TransactionType.DEPOSIT,
      },
    });

    if (!depositTx) {
      depositTx = await this.transactionRepo.findOne({
        where: [
          {
            request: { id: request.id },
            user: { id: request.requester.id },
            status: TransactionStatus.Pending,
            type: TransactionType.DEPOSIT,
          },
          {
            request: { id: request.id },
            user: { id: request.requester.id },
            status: TransactionStatus.WaitingApproval,
            type: TransactionType.DEPOSIT,
          },
        ],
        order: { id: 'DESC' },
      });
    }

    let sourceDepositTx = depositTx;
    if (!sourceDepositTx) {
      // Try to use any historical DEPOSIT to get exact amount (100% of what requester actually deposited)
      const anyDepositTx = await this.transactionRepo.findOne({
        where: {
          request: { id: request.id },
          user: { id: request.requester.id },
          type: TransactionType.DEPOSIT,
        },
        order: { id: 'DESC' },
      });
      sourceDepositTx = anyDepositTx ?? null;
      if (!sourceDepositTx) {
        logger.warn(`[PAYOUT_DEPOSIT] No deposit transaction found at all for request ${request.id}. Skipping payout.`);
        return;
      }
      logger.warn(`[PAYOUT_DEPOSIT] Using historical DEPOSIT tx id=${sourceDepositTx.id} for payout.`);
    }

    const amount = Math.abs(Number(sourceDepositTx.amount));

    // Move funds from admin wallet to translator wallet
    const adminWallet = await this.walletManagerService.getOrCreateWallet(this.ADMIN_USER_ID);
    const adminBefore = Number(adminWallet.balance);
    adminWallet.balance = Number(adminWallet.balance) - amount;
    await this.walletRepository.save(adminWallet);
    logger.log(`[PAYOUT_DEPOSIT] Admin wallet: ${adminBefore} -> ${adminWallet.balance}`);

    const translatorId = request.assignee?.id;
    if (!translatorId) {
      logger.warn(`[PAYOUT_DEPOSIT] Request ${request.id} has no assignee; skipping payout`);
      return;
    }

    const translatorWallet = await this.walletManagerService.getOrCreateWallet(translatorId);
    const translatorBefore = Number(translatorWallet.balance);
    translatorWallet.balance = Number(translatorWallet.balance) + amount;
    await this.walletRepository.save(translatorWallet);
    logger.log(`[PAYOUT_DEPOSIT] Translator wallet (${translatorId}): ${translatorBefore} -> ${translatorWallet.balance}`);

    // Close the original deposit as Completed if exists
    if (sourceDepositTx) {
      sourceDepositTx.status = TransactionStatus.Completed;
      await this.transactionRepo.save(sourceDepositTx);
      logger.log(`[PAYOUT_DEPOSIT] Updated DEPOSIT tx ${sourceDepositTx.id} -> Completed`);
    }

    // Create translator PAYMENT transaction for audit trail
    const translatorPayment = this.transactionRepo.create({
      user: { id: translatorId } as UserEntity,
      request: { id: request.id } as RequestEntity,
      amount: amount as any,
      status: TransactionStatus.Completed,
      type: TransactionType.PAYMENT,
    });
    await this.transactionRepo.save(translatorPayment);
    logger.log(`[PAYOUT_DEPOSIT] Created PAYMENT tx for translator id=${translatorPayment.id} amount=$${amount}`);

    // Notify translator
    await this.notificationService.createNotification({
      userId: translatorId,
      type: 'DEPOSIT_PAID_TO_TRANSLATOR',
      message: `Deposit $${amount} for request "${request.title}" has been paid to your balance due to requester cancellation.`,
      createdBy: this.ADMIN_USER_ID,
    });

    logger.log(`[PAYOUT_DEPOSIT] Paid $${amount} to translator ${translatorId} for request ${request.id}`);

    // Debug wallets AFTER payout
    try {
      const adminWAfter = await this.walletManagerService.getOrCreateWallet(this.ADMIN_USER_ID);
      const requesterWAfter = await this.walletManagerService.getOrCreateWallet(request.requester.id);
      const translatorWAfter = request.assignee?.id ? await this.walletManagerService.getOrCreateWallet(request.assignee.id) : undefined;

      console.log('[PAYOUT_DEPOSIT][AFTER] Wallet balances:', {
        admin: Number(adminWAfter.balance),
        requesterId: request.requester.id?.toString?.(),
        requester: Number(requesterWAfter.balance),
        translatorId: request.assignee?.id?.toString?.(),
        translator: translatorWAfter ? Number(translatorWAfter.balance) : null,
      });
    } catch (e) {
      console.warn('[PAYOUT_DEPOSIT] Failed to fetch AFTER wallet balances:', e);
    }
  }

  // New: Handle requester cancellation when request is already Approved without crediting requester balance
  async payoutDepositToTranslatorOnApprovedCancel(request: RequestEntity): Promise<void> {
    // Debug wallets BEFORE payout
    try {
      const adminWBefore = await this.walletManagerService.getOrCreateWallet(this.ADMIN_USER_ID);
      const requesterWBefore = await this.walletManagerService.getOrCreateWallet(request.requester.id);
      const translatorWBefore = request.assignee?.id ? await this.walletManagerService.getOrCreateWallet(request.assignee.id) : undefined;
      console.log('[PAYOUT_DEPOSIT_APPROVED_CANCEL][BEFORE] Wallet balances:', {
        admin: Number(adminWBefore.balance),
        requesterId: request.requester.id?.toString?.(),
        requester: Number(requesterWBefore.balance),
        translatorId: request.assignee?.id?.toString?.(),
        translator: translatorWBefore ? Number(translatorWBefore.balance) : null,
      });
    } catch (e) {
      console.warn('[PAYOUT_DEPOSIT_APPROVED_CANCEL] Failed to fetch BEFORE wallet balances:', e);
    }

    // Find the original deposit (prefer ON_HOLD; fallback to PENDING/WAITING_APPROVAL)
    let depositTx = await this.transactionRepo.findOne({
      where: {
        request: { id: request.id },
        user: { id: request.requester.id },
        status: TransactionStatus.On_Hold,
        type: TransactionType.DEPOSIT,
      },
    });

    if (!depositTx) {
      depositTx = await this.transactionRepo.findOne({
        where: [
          {
            request: { id: request.id },
            user: { id: request.requester.id },
            status: TransactionStatus.Pending,
            type: TransactionType.DEPOSIT,
          },
          {
            request: { id: request.id },
            user: { id: request.requester.id },
            status: TransactionStatus.WaitingApproval,
            type: TransactionType.DEPOSIT,
          },
        ],
        order: { id: 'DESC' },
      });
    }

    let sourceDepositTx = depositTx;
    if (!sourceDepositTx) {
      // Fallback to any historical DEPOSIT amount
      const anyDepositTx = await this.transactionRepo.findOne({
        where: {
          request: { id: request.id },
          user: { id: request.requester.id },
          type: TransactionType.DEPOSIT,
        },
        order: { id: 'DESC' },
      });
      sourceDepositTx = anyDepositTx ?? null;
      if (!sourceDepositTx) {
        logger.warn(`[PAYOUT_DEPOSIT_APPROVED_CANCEL] No deposit transaction found for request ${request.id}. Skipping payout.`);
        return;
      }
      logger.warn(`[PAYOUT_DEPOSIT_APPROVED_CANCEL] Using historical DEPOSIT tx id=${sourceDepositTx.id} for payout.`);
    }

    const amount = Math.abs(Number(sourceDepositTx.amount));

    // Move funds from admin wallet to translator wallet
    const adminWallet = await this.walletManagerService.getOrCreateWallet(this.ADMIN_USER_ID);
    const adminBefore = Number(adminWallet.balance);
    adminWallet.balance = Number(adminWallet.balance) - amount;
    await this.walletRepository.save(adminWallet);
    logger.log(`[PAYOUT_DEPOSIT_APPROVED_CANCEL] Admin wallet: ${adminBefore} -> ${adminWallet.balance}`);

    const translatorId = request.assignee?.id;
    if (!translatorId) {
      logger.warn(`[PAYOUT_DEPOSIT_APPROVED_CANCEL] Request ${request.id} has no assignee; skipping payout`);
      return;
    }

    const translatorWallet = await this.walletManagerService.getOrCreateWallet(translatorId);
    const translatorBefore = Number(translatorWallet.balance);
    translatorWallet.balance = Number(translatorWallet.balance) + amount;
    await this.walletRepository.save(translatorWallet);
    logger.log(`[PAYOUT_DEPOSIT_APPROVED_CANCEL] Translator wallet (${translatorId}): ${translatorBefore} -> ${translatorWallet.balance}`);

    // Mark the requester's DEPOSIT as Completed to reflect finalized hold payout
    if (sourceDepositTx) {
      const oldStatus = sourceDepositTx.status;
      sourceDepositTx.status = TransactionStatus.Completed;
      await this.transactionRepo.save(sourceDepositTx);
      logger.log(`[PAYOUT_DEPOSIT_APPROVED_CANCEL] Updated DEPOSIT tx ${sourceDepositTx.id} ${oldStatus} -> Completed`);
    }

    // Create translator PAYMENT transaction for audit trail (net deposit amount)
    const translatorPayment = this.transactionRepo.create({
      user: { id: translatorId } as UserEntity,
      request: { id: request.id } as RequestEntity,
      amount: amount as any,
      status: TransactionStatus.Completed,
      type: TransactionType.PAYMENT,
    });
    await this.transactionRepo.save(translatorPayment);
    logger.log(`[PAYOUT_DEPOSIT_APPROVED_CANCEL] Created PAYMENT tx for translator id=${translatorPayment.id} amount=$${amount}`);

    // Notify translator
    await this.notificationService.createNotification({
      userId: translatorId,
      type: 'DEPOSIT_PAID_TO_TRANSLATOR',
      message: `Deposit $${amount} for request "${request.title}" has been paid to your balance due to requester cancellation (Approved state).`,
      createdBy: this.ADMIN_USER_ID,
    });

    // Debug wallets AFTER payout
    try {
      const adminWAfter = await this.walletManagerService.getOrCreateWallet(this.ADMIN_USER_ID);
      const requesterWAfter = await this.walletManagerService.getOrCreateWallet(request.requester.id);
      const translatorWAfter = request.assignee?.id ? await this.walletManagerService.getOrCreateWallet(request.assignee.id) : undefined;

      console.log('[PAYOUT_DEPOSIT_APPROVED_CANCEL][AFTER] Wallet balances:', {
        admin: Number(adminWAfter.balance),
        requesterId: request.requester.id?.toString?.(),
        requester: Number(requesterWAfter.balance),
        translatorId: request.assignee?.id?.toString?.(),
        translator: translatorWAfter ? Number(translatorWAfter.balance) : null,
      });
    } catch (e) {
      console.warn('[PAYOUT_DEPOSIT_APPROVED_CANCEL] Failed to fetch AFTER wallet balances:', e);
    }
  }

  // Create PayPal order for the remaining 50% payment when requester approves
  async createFinalPaymentOrder(requestId: bigint): Promise<{ approvalUrl: string }> {
    console.log('🔍 [DEBUG] createFinalPaymentOrder called with requestId:', requestId);

    const request = await this.requestRepository.findOneOrFail({
      where: { id: requestId },
      relations: ['requester', 'assignee'],
    });

    console.log('🔍 [DEBUG] Request found:', {
      requestId: request.id,
      requesterId: request.requester?.id,
      requesterEmail: request.requester?.email,
      assigneeId: request.assignee?.id,
      assigneeEmail: request.assignee?.email,
      dealAmount: request.dealAmount
    });

    if (!request.assignee || !request.requester) {
      throw new BadRequestException('Request must have both requester and assignee.');
    }

    // Find original deposit transaction (50%) by requester
    console.log('🔍 [DEBUG] Looking for original deposit transaction...');
    const depositTx = await this.transactionRepo.findOneOrFail({
      where: {
        request: { id: requestId },
        user: { id: request.requester.id },
        type: TransactionType.DEPOSIT,
      },
      relations: ['request', 'user'],
    });

    console.log('🔍 [DEBUG] Found deposit transaction:', {
      id: depositTx.id,
      amount: depositTx.amount,
      status: depositTx.status,
      type: depositTx.type,
      userId: depositTx.user?.id,
      requestId: depositTx.request?.id
    });

    const finalAmount = Number(depositTx.amount);
    if (finalAmount <= 0) {
      throw new BadRequestException('Invalid deposit amount for final payment.');
    }

    console.log('🔍 [DEBUG] Final payment amount calculated:', {
      originalDepositAmount: depositTx.amount,
      finalAmount: finalAmount,
      totalForTranslator: finalAmount * 2
    });

    const accessToken = await this.getAccessToken();
    const orderData = {
      intent: 'CAPTURE',
      purchase_units: [
        {
          amount: {
            currency_code: 'USD',
            value: finalAmount.toFixed(2),
          },
          description: `Final 50% payment for request ID ${request.id}`,
        },
      ],
      application_context: {
        // Redirect to backend callback first, then backend will redirect to frontend
        return_url: this.buildServerUrl('payment/paypal/final/success'),
        cancel_url: this.buildServerUrl('payment/paypal/final/cancel'),
        brand_name: 'HereToTranslate',
        user_action: 'PAY_NOW',
      },
    } as any;

    console.log('🔍 [DEBUG] PayPal order data:', JSON.stringify(orderData, null, 2));

    const { data } = await axios.post(
      `${this.api}/v2/checkout/orders`,
      orderData,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      }
    );

    console.log('🔍 [DEBUG] PayPal order created successfully:', {
      orderId: data.id,
      status: data.status,
      links: data.links?.map((l: any) => ({ rel: l.rel, href: l.href }))
    });

    const approvalUrl = data.links?.find((l: any) => l.rel === 'approve')?.href;
    if (!approvalUrl) {
      throw new InternalServerErrorException('No approval URL returned by PayPal.');
    }

    console.log('🔍 [DEBUG] Approval URL:', approvalUrl);

    // Create a pending PAYMENT transaction for requester to track this orderId
    console.log('🔍 [DEBUG] Creating pending PAYMENT transaction for requester...');
    const pendingTransaction = {
      user: { id: request.requester.id } as UserEntity,
      request: { id: request.id } as RequestEntity,
      amount: finalAmount,
      status: TransactionStatus.Pending,
      type: TransactionType.PAYMENT,
      paypalOrderId: data.id,
    };

    console.log('🔍 [DEBUG] Transaction data to save:', {
      userId: pendingTransaction.user.id,
      requestId: pendingTransaction.request.id,
      amount: pendingTransaction.amount,
      status: pendingTransaction.status,
      type: pendingTransaction.type,
      paypalOrderId: pendingTransaction.paypalOrderId
    });

    const savedTransaction = await this.transactionRepo.save(pendingTransaction);

    console.log('🔍 [DEBUG] Transaction saved successfully:', {
      id: savedTransaction.id,
      userId: savedTransaction.user?.id,
      requestId: savedTransaction.request?.id,
      amount: savedTransaction.amount,
      status: savedTransaction.status,
      type: savedTransaction.type,
      paypalOrderId: savedTransaction.paypalOrderId
    });

    console.log('🔍 [DEBUG] createFinalPaymentOrder completed successfully');
    return { approvalUrl };
  }

  // Capture final 50% order, release deposit and pay translator 100%
  async captureFinalPayment(orderId: string) {
    console.log('🔍 [PAYMENT SERVICE] captureFinalPayment called with orderId:', orderId);
    console.log('🔍 [DEBUG] ===========================================');
    console.log('🔍 [DEBUG] STARTING FINAL PAYMENT CAPTURE PROCESS');
    console.log('🔍 [DEBUG] ===========================================');

    try {
      const accessToken = await this.getAccessToken();
      console.log('🔍 [PAYMENT SERVICE] Got access token, capturing payment...');

      const captureRes = await axios.post(
        `${this.api}/v2/checkout/orders/${orderId}/capture`,
        {},
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('🔍 [PAYMENT SERVICE] PayPal capture response status:', captureRes.status);
      console.log('🔍 [PAYMENT SERVICE] PayPal capture response data:', JSON.stringify(captureRes.data, null, 2));

      if (captureRes.status !== 201) {
        throw new InternalServerErrorException('Payment capture failed');
      }

      console.log('🔍 [PAYMENT SERVICE] Looking for transaction with orderId:', orderId);

      // Find the pending PAYMENT transaction created earlier for the requester
      console.log('🔍 [DEBUG] STEP 1: Finding pending PAYMENT transaction...');
      const finalPaymentTx = await this.transactionRepo.findOneOrFail({
        where: { paypalOrderId: orderId },
        relations: ['request', 'user', 'request.requester', 'request.assignee'],
      });

      console.log('🔍 [PAYMENT SERVICE] Found final payment transaction:', {
        id: finalPaymentTx.id,
        requestId: finalPaymentTx.request?.id,
        userId: finalPaymentTx.user?.id,
        amount: finalPaymentTx.amount,
        status: finalPaymentTx.status,
        type: finalPaymentTx.type,
        paypalOrderId: finalPaymentTx.paypalOrderId
      });

      const request = finalPaymentTx.request;
      const requester = request.requester;
      const translator = request.assignee;

      console.log('🔍 [PAYMENT SERVICE] Request details:', {
        requestId: request.id,
        requesterId: requester?.id,
        requesterEmail: requester?.email,
        translatorId: translator?.id,
        translatorEmail: translator?.email
      });

      if (!translator || !requester) {
        throw new InternalServerErrorException('Missing requester or translator');
      }

      console.log('🔍 [PAYMENT SERVICE] Looking for deposit transaction...');

      // Locate the original deposit transaction
      console.log('🔍 [DEBUG] STEP 2: Finding original DEPOSIT transaction...');
      const depositTx = await this.transactionRepo.findOneOrFail({
        where: {
          request: { id: request.id },
          user: { id: requester.id },
          type: TransactionType.DEPOSIT,
        },
      });

      console.log('🔍 [PAYMENT SERVICE] Found deposit transaction:', {
        id: depositTx.id,
        amount: depositTx.amount,
        status: depositTx.status,
        type: depositTx.type,
        userId: depositTx.user?.id,
        requestId: depositTx.request?.id
      });

      const depositAmount = Number(depositTx.amount);
      const finalAmount = Number(finalPaymentTx.amount);

      console.log('🔍 [PAYMENT SERVICE] Processing amounts:', {
        depositAmount,
        finalAmount,
        totalForTranslator: depositAmount + finalAmount,
        depositTxStatus: depositTx.status,
        finalPaymentTxStatus: finalPaymentTx.status
      });

      // 1) Mark deposit transaction as COMPLETED (was ON_HOLD)
      console.log('🔍 [DEBUG] STEP 3: Updating deposit transaction status to COMPLETED...');
      console.log('🔍 [DEBUG] Before update - Deposit transaction:', {
        id: depositTx.id,
        oldStatus: depositTx.status,
        newStatus: TransactionStatus.Completed
      });

      depositTx.status = TransactionStatus.Completed;
      const updatedDepositTx = await this.transactionRepo.save(depositTx);

      console.log('🔍 [DEBUG] After update - Deposit transaction:', {
        id: updatedDepositTx.id,
        newStatus: updatedDepositTx.status,
        amount: updatedDepositTx.amount
      });

      // 2) Mark final payment transaction as COMPLETED
      console.log('🔍 [DEBUG] STEP 4: Updating final payment transaction status to COMPLETED...');
      console.log('🔍 [DEBUG] Before update - Final payment transaction:', {
        id: finalPaymentTx.id,
        oldStatus: finalPaymentTx.status,
        newStatus: TransactionStatus.Completed
      });

      finalPaymentTx.status = TransactionStatus.Completed;
      const updatedFinalPaymentTx = await this.transactionRepo.save(finalPaymentTx);

      console.log('🔍 [DEBUG] After update - Final payment transaction:', {
        id: updatedFinalPaymentTx.id,
        newStatus: updatedFinalPaymentTx.status,
        amount: updatedFinalPaymentTx.amount
      });

      console.log('🔍 [PAYMENT SERVICE] Updated transaction statuses to Completed');

      // 3) Release held deposit from admin wallet and pay translator total 100%
      console.log('🔍 [DEBUG] STEP 5: Updating admin wallet (releasing held deposit)...');
      const adminWallet = await this.walletManagerService.getOrCreateWallet(this.ADMIN_USER_ID);
      const adminOldBalance = adminWallet.balance;

      console.log('🔍 [DEBUG] Admin wallet before update:', {
        adminUserId: this.ADMIN_USER_ID,
        oldBalance: adminOldBalance,
        amountToDeduct: depositAmount,
        newBalance: Number(adminOldBalance) - depositAmount
      });

      adminWallet.balance = Number(adminWallet.balance) - depositAmount;
      const updatedAdminWallet = await this.walletRepository.save(adminWallet);

      console.log('🔍 [DEBUG] Admin wallet after update:', {
        adminUserId: this.ADMIN_USER_ID,
        oldBalance: adminOldBalance,
        newBalance: updatedAdminWallet.balance,
        deducted: depositAmount
      });

      // 4) Calculate platform fee and add net amount to translator wallet
      console.log('🔍 [DEBUG] STEP 6: Calculating platform fee and updating translator wallet...');
      const translatorWallet = await this.walletManagerService.getOrCreateWallet(translator.id);
      const translatorOldBalance = translatorWallet.balance;
      const grossPayout = depositAmount + finalAmount;
      const feePercentage = await this.feeService.getDefaultFee();
      const feeAmount = Number((grossPayout * (feePercentage / 100)).toFixed(2));
      const netToTranslator = Number((grossPayout - feeAmount).toFixed(2));

      console.log('🔍 [DEBUG] Translator wallet before update:', {
        translatorId: translator.id,
        translatorEmail: translator.email,
        oldBalance: translatorOldBalance,
        grossPayout,
        feePercentage,
        feeAmount,
        netToTranslator,
        newBalance: Number(translatorOldBalance) + netToTranslator
      });

      translatorWallet.balance = Number(translatorWallet.balance) + netToTranslator;
      const updatedTranslatorWallet = await this.walletRepository.save(translatorWallet);

      console.log('🔍 [DEBUG] Translator wallet after update:', {
        translatorId: translator.id,
        translatorEmail: translator.email,
        oldBalance: translatorOldBalance,
        newBalance: updatedTranslatorWallet.balance,
        added: netToTranslator
      });

      // 5) Create translator PAYMENT transaction with net amount and record platform fee for admin
      console.log('🔍 [DEBUG] STEP 7: Creating translator PAYMENT transaction and platform fee transaction...');
      const translatorTransactionData = {
        user: { id: translator.id } as UserEntity,
        request: { id: request.id } as RequestEntity,
        amount: netToTranslator,
        status: TransactionStatus.Completed,
        type: TransactionType.PAYMENT,
      };

      console.log('🔍 [DEBUG] Translator transaction data to create:', {
        userId: translatorTransactionData.user.id,
        requestId: translatorTransactionData.request.id,
        amount: translatorTransactionData.amount,
        status: translatorTransactionData.status,
        type: translatorTransactionData.type
      });

      const translatorTransaction = await this.transactionRepo.save(translatorTransactionData);

      console.log('🔍 [PAYMENT SERVICE] Created translator transaction:', {
        id: translatorTransaction.id,
        amount: translatorTransaction.amount,
        status: translatorTransaction.status,
        type: translatorTransaction.type,
        userId: translatorTransaction.user?.id,
        requestId: translatorTransaction.request?.id
      });

      // Record platform fee: credit fee to admin wallet and create a transaction entry
      const adminWalletAfter = await this.walletManagerService.getOrCreateWallet(this.ADMIN_USER_ID);
      const adminBeforeFee = Number(adminWalletAfter.balance);
      adminWalletAfter.balance = Number(adminWalletAfter.balance) + feeAmount;
      await this.walletRepository.save(adminWalletAfter);
      await this.transactionRepo.save({
        user: { id: this.ADMIN_USER_ID } as UserEntity,
        request: { id: request.id } as RequestEntity,
        amount: feeAmount,
        status: TransactionStatus.Completed,
        // Intentionally omit type to mirror fee recording in finalizeTranslation
      });
      console.log('🔍 [DEBUG] Platform fee recorded:', { feePercentage, feeAmount, adminBeforeFee, adminAfterFee: adminWalletAfter.balance });

      // 6) Mark request completed
      console.log('🔍 [DEBUG] STEP 8: Marking request as COMPLETED...');
      console.log('🔍 [DEBUG] Request before update:', {
        id: request.id,
        oldStatus: request.status,
        newStatus: RequestStatus.Completed
      });

      request.status = RequestStatus.Completed;
      const updatedRequest = await this.requestRepository.save(request);

      console.log('🔍 [DEBUG] Request after update:', {
        id: updatedRequest.id,
        newStatus: updatedRequest.status
      });

      console.log('🔍 [PAYMENT SERVICE] Marked request as completed');

      const result = {
        success: true,
        requestId: request.id,
        translatorId: translator.id,
        paidToTranslator: netToTranslator,
        depositAmount: depositAmount,
        finalAmount: finalAmount
      };

      console.log('🔍 [DEBUG] ===========================================');
      console.log('🔍 [DEBUG] FINAL PAYMENT CAPTURE PROCESS COMPLETED');
      console.log('🔍 [DEBUG] ===========================================');
      console.log('🔍 [DEBUG] Final result:', result);
      console.log('🔍 [PAYMENT SERVICE] Returning result:', result);
      return result;

    } catch (error) {
      console.error('🔍 [PAYMENT SERVICE] captureFinalPayment error:', error);
      console.error('🔍 [DEBUG] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      throw error;
    }
  }

}
