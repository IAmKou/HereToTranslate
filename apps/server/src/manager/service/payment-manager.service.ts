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
        paypalOrderId: data.id,
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

      const requesterTransaction = await this.transactionRepo.save({
        user,
        request,
        amount: depositAmount,
        status: TransactionStatus.Pending,
        paypalOrderId: data.id,
      });

      console.log(
        '✅ Successfully saved requester transaction in createPrivateDeposit:',
        {
          id: requesterTransaction.id,
          userId: requesterTransaction.user?.id,
          requestId: requesterTransaction.request?.id,
          amount: requesterTransaction.amount,
          status: requesterTransaction.status,
          paypalOrderId: requesterTransaction.paypalOrderId,
          userEmail: requesterTransaction.user?.email,
          requestDescription: requesterTransaction.request?.description,
          createdAt: requesterTransaction.createdAt,
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
        registrantsCount: transaction.request?.registrants?.length || 0,
      });

      const { user: payerUser, request } = transaction;

      console.log('🔄 Finding translator from registrants:', {
        registrants: request.registrants?.map((r) => ({
          id: r.id,
          email: r.email,
        })),
        payerUserId: payerUser.id,
        payerUserEmail: payerUser.email,
      });

      const translator = request.registrants.find(
        (registrant) => registrant.id !== payerUser.id
      );

      if (!translator) {
        console.error('❌ No translator found in registrants');
        throw new Error('No translator found in registrants');
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

        // Get translator's wallet to access paypalEmail
        const translatorWallet =
          await this.walletManagerService.getOrCreateWallet(translator.id);

        console.log('🔄 Creating translator transaction:', {
          userId: translator.id,
          userEmail: translator.email,
          amount: Math.abs(transaction.amount),
          requestId: request.id,
        });

        const translatorTransaction = this.transactionRepo.create({
          user: { id: translator.id },
          request: { id: request.id },
          amount: Math.abs(transaction.amount),
          status: TransactionStatus.On_Hold,
          paypalEmail: translatorWallet?.paypalEmail ?? null,
        } as DeepPartial<TransactionEntity>);

        // Get payer's wallet to access paypalEmail
        const payerWallet = await this.walletManagerService.getOrCreateWallet(
          payerUser.id
        );

        console.log('🔄 Creating requester transaction:', {
          userId: payerUser.id,
          userEmail: payerUser.email,
          amount: Math.abs(transaction.amount),
          requestId: request.id,
        });

        const requesterTransaction = this.transactionRepo.create({
          user: { id: payerUser.id },
          request: { id: request.id },
          amount: Math.abs(transaction.amount),
          status: TransactionStatus.On_Hold,
          paypalEmail: payerWallet?.paypalEmail ?? null,
        } as DeepPartial<TransactionEntity>);

        console.log('✅ Created requester transaction:', {
          id: requesterTransaction.id,
          userId: requesterTransaction.user?.id,
          userEmail: requesterTransaction.user?.email,
          requestId: requesterTransaction.request?.id,
          amount: requesterTransaction.amount,
          status: requesterTransaction.status,
          type: 'Deposit', // Thêm type để debug
        });

        // Log transaction của translator
        console.log('[DEBUG] TRANSLATOR TRANSACTION:', {
          userId: translatorTransaction.user?.id,
          userEmail: translatorTransaction.user?.email,
          requestId: translatorTransaction.request?.id,
          amount: translatorTransaction.amount,
          status: translatorTransaction.status,
        });

        // Log transaction của requester
        console.log('[DEBUG] REQUESTER TRANSACTION:', {
          userId: requesterTransaction.user?.id,
          userEmail: requesterTransaction.user?.email,
          requestId: requesterTransaction.request?.id,
          amount: requesterTransaction.amount,
          status: requesterTransaction.status,
        });

        // Generate manifest for each file associated with the request
        if (request.files && request.files.length > 0) {
          console.log(
            `🔄 Generating manifests for ${request.files.length} files...`
          );
          for (const file of request.files) {
            try {
              await this.manifestService.generateManifest(file);
              console.log(`✅ Generated manifest for file: ${file.fileName}`);
            } catch (error) {
              console.error(
                `❌ Failed to generate manifest for file ${file.fileName}:`,
                error
              );
              // Continue with other files even if one fails
            }
          }
        } else {
          console.log(
            'ℹ️ No files found for request, skipping manifest generation'
          );
        }

        console.log('🔄 Saving all transactions to database...');
        await queryRunner.manager.save([
          request,
          transaction,
          translatorTransaction,
          requesterTransaction,
        ]);
        console.log('✅ Successfully saved all transactions to database');

        console.log(
          '✅ Created transactions in capturePaymentAndCreateProject:',
          {
            originalTransaction: {
              id: transaction.id,
              userId: transaction.user?.id,
              userEmail: transaction.user?.email,
              amount: transaction.amount,
              status: transaction.status,
            },
            translatorTransaction: {
              id: translatorTransaction.id,
              userId: translatorTransaction.user?.id,
              userEmail: translatorTransaction.user?.email,
              amount: translatorTransaction.amount,
              status: translatorTransaction.status,
            },
            requesterTransaction: {
              id: requesterTransaction.id,
              userId: requesterTransaction.user?.id,
              userEmail: requesterTransaction.user?.email,
              amount: requesterTransaction.amount,
              status: requesterTransaction.status,
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
        adminWallet.balance =
          Number(adminWallet.balance) + Number(transaction.amount);
        await queryRunner.manager.save(adminWallet);

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

      transaction.status = TransactionStatus.On_Hold;

      let translatorTransaction = null;
      if (request.assignee && request.assignee.id !== user.id) {
        const assigneeWallet =
          await this.walletManagerService.getOrCreateWallet(
            request.assignee.id
          );

        translatorTransaction = this.transactionRepo.create({
          user: { id: request.assignee.id },
          request: { id: request.id },
          amount: transaction.amount,
          status: TransactionStatus.On_Hold,
          paypalEmail: assigneeWallet?.paypalEmail ?? null,
        } as DeepPartial<TransactionEntity>);
      }

      await this.transactionRepo.save(transaction);
      if (translatorTransaction) {
        await this.transactionRepo.save(translatorTransaction);
      }

      const requesterWallet = await this.walletManagerService.getOrCreateWallet(
        request.requester.id
      );

      const requesterTransaction = this.transactionRepo.create({
        user: { id: request.requester.id },
        request: { id: request.id },
        amount: Math.abs(transaction.amount),
        status: TransactionStatus.Completed,
        paypalEmail: requesterWallet?.paypalEmail ?? null,
      } as DeepPartial<TransactionEntity>);

      await this.transactionRepo.save(requesterTransaction);
      // Log để debug
      console.log('[DEBUG] REQUESTER TRANSACTION (capturePayment):', {
        id: requesterTransaction.id,
        userId: requesterTransaction.user?.id,
        userEmail: requesterTransaction.user?.email,
        requestId: requesterTransaction.request?.id,
        amount: requesterTransaction.amount,
        status: requesterTransaction.status,
      });

      let projectId = null;
      let receiver = null;
      // Nếu là public request, cập nhật trạng thái sang Approved và tạo project mới
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
            // Gán assignee là user vừa thanh toán
            request.assignee = user;
            // Gọi service tạo project từ request
            const createResult =
              await this.projectService.createProjectFromRequest(
                request,
                user.id
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
      }

      const adminWallet = await this.walletManagerService.getOrCreateWallet(
        this.ADMIN_USER_ID
      );
      adminWallet.balance =
        Number(adminWallet.balance) + Number(transaction.amount);
      await this.walletRepository.save(adminWallet);
      // Cộng tiền vào balance của user
      const userWallet = await this.walletManagerService.getOrCreateWallet(
        user.id
      );
      userWallet.balance =
        Number(userWallet.balance) + Number(transaction.amount);
      await this.walletManagerService['walletRepository'].save(userWallet);

      logger.log(
        `[PayPal] Payment captured for order ${orderId}, request ID ${request.id}, user ID ${user.id}, projectId: ${projectId}`
      );

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
    
    // Debug: log balance values and types
    console.log('Withdraw - Balance check:', {
      userId,
      requestedAmount: amount,
      requestedAmountType: typeof amount,
      staticWalletBalance: userWallet.balance,
      dynamicBalance: walletDetails.balance,
      totalDeposits: walletDetails.totalDeposits,
      totalWithdrawn: walletDetails.totalWithdrawn,
      pendingWithdrawals: walletDetails.pendingWithdrawals,
      holdAmount: walletDetails.holdAmount,
      comparison: walletDetails.balance < amount
    });
    
    if (walletDetails.balance < amount) {
      throw new BadRequestException(`Insufficient balance for withdrawal. You have $${walletDetails.balance} but requested $${amount}`);
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
      relations: ['requester'],
    });

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

    const wallet = await this.walletManagerService.getOrCreateWallet(request.requester.id);

    if (wallet.balance < remainingAmount) {
      throw new BadRequestException('Not enough balance to pay final 50%.');
    }

    wallet.balance -= remainingAmount;
    await this.walletRepository.save(wallet);

    const tx = this.transactionRepo.create({
      user: { id: request.requester.id },
      request: { id: request.id },
      amount: remainingAmount,
      status: TransactionStatus.Completed,
    });

    await this.transactionRepo.save(tx);
  }

  async refundDeposit(request: RequestEntity): Promise<void> {
    logger.log(`Starting refund process for request ID: ${request.id}`);

    const depositTransaction = await this.transactionRepo.findOne({
      where: {
        request: { id: request.id },
        user: { id: request.requester.id },
        status: TransactionStatus.Pending,
      },
      relations: ['user'],
    });

    if (!depositTransaction) {
      logger.warn(`No pending deposit transaction found for request ID: ${request.id}`);
      return;
    }

    try {
      const wallet = await this.walletManagerService.getOrCreateWallet(
        request.requester.id
      );

      wallet.balance = Number(wallet.balance) + Number(depositTransaction.amount);
      await this.walletRepository.save(wallet);

      depositTransaction.status = TransactionStatus.Failed;
      await this.transactionRepo.save(depositTransaction);

      const refundTransaction = this.transactionRepo.create({
        user: { id: request.requester.id } as UserEntity,
        request: { id: request.id } as RequestEntity,
        amount: depositTransaction.amount,
        status: TransactionStatus.Completed,
      });

      await this.transactionRepo.save(refundTransaction);

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

}
