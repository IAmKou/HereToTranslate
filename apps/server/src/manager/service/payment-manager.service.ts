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
import { TranslationService } from '#LocalProject/Managers/service/translation-manager.service';

@Injectable()
export class PaypalService {
  private readonly api = process.env.PAYPAL_API;
  private accessToken: string;
  private readonly ADMIN_USER_ID = 1n; // use config/env if preferred

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
    private readonly translationService: TranslationService
  ) {}

  private async getAccessToken(): Promise<string> {
    if (this.accessToken) return this.accessToken;

    const auth = Buffer.from(
      `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
    ).toString('base64');

    try {
      const res = await axios.post(
        `${this.api}/v1/oauth2/token`,
        'grant_type=client_credentials',
        {
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }
      );

      this.accessToken = res.data.access_token;
      return this.accessToken;
    } catch (err) {
      console.error(err);
      throw new InternalServerErrorException(
        'Failed to authenticate with PayPal'
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

    const totalWithFee = parseFloat((baseAmount * 1.05).toFixed(2));
    const depositAmount = parseFloat((totalWithFee * 0.5).toFixed(2));

    const accessToken = await this.getAccessToken();

    try {
      const { data } = await axios.post(
        `${this.api}/v2/checkout/orders`,
        {
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
            return_url: `http://localhost:4200/paypal-success`,
            cancel_url: `http://localhost:4200/paypal/cancel`,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
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

      await this.transactionRepo.save({
        user,
        request,
        amount: depositAmount,
        status: TransactionStatus.Pending,
        paypalOrderId: data.id,
      });

      return approvalUrl;
    } catch (err) {
      if (axios.isAxiosError(err)) {
        console.error('PayPal API error:', {
          status: err.response?.status,
          data: err.response?.data,
          message: err.message,
        });
      } else {
        console.error('Unexpected error:', err);
      }

      throw new InternalServerErrorException('Failed to create PayPal deposit');
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

    const totalWithFee = parseFloat((baseAmount * 1.05).toFixed(2));
    const depositAmount = parseFloat((totalWithFee * 0.5).toFixed(2));

    const accessToken = await this.getAccessToken();

    try {
      const { data } = await axios.post(
        `${this.api}/v2/checkout/orders`,
        {
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
            return_url: `http://localhost:4200/paypal-success`,
            cancel_url: `http://localhost:4200/paypal/cancel`,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
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

      await this.transactionRepo.save({
        user,
        request,
        amount: depositAmount,
        status: TransactionStatus.Pending,
        paypalOrderId: data.id,
      });

      return approvalUrl;
    } catch (err) {
      if (axios.isAxiosError(err)) {
        console.error('PayPal API error:', {
          status: err.response?.status,
          data: err.response?.data,
          message: err.message,
        });
      } else {
        console.error('Unexpected error:', err);
      }

      throw new InternalServerErrorException('Failed to create PayPal deposit');
    }
  }

  async capturePaymentAndCreateProject(orderId: string) {
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
          'request.registrants',
          'request.category',
        ],
      });

      const { user: selectedUser, request } = transaction;

      const otherUserIds = request.registrants
        .map((user) => Number(user.id))
        .filter((uid) => uid !== Number(selectedUser.id));

      const queryRunner = this.projectService['dataSource'].createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        const createResult = await this.projectService.createProjectFromRequest(
          request,
          selectedUser.id
        );

        const newProject = await this.projectRepository.findOneOrFail({
          where: { id: createResult.projectId },
        });

        request.assignee = selectedUser;
        request.registrants = [];
        request.project = newProject;
        request.status = RequestStatus.Approved;
        transaction.status = TransactionStatus.On_Hold;

        await this.translationService.extractStringsForRequestFiles(request.id);

        await queryRunner.manager.save([request, transaction]);

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
        relations: ['user', 'request'],
      });
      const user = transaction.user;
      let request = transaction.request;
      // Luôn load lại request với quan hệ category nếu là public
      if (request.isPublic && !request.category) {
        request = await this.requestRepository.findOneOrFail({
          where: { id: request.id },
          relations: ['category'],
        });
      }

      if (!request || !user) {
        throw new Error('Invalid request or user information.');
      }

      // Mark transaction and request status
      transaction.status = TransactionStatus.On_Hold;
      await this.transactionRepo.save(transaction);

      let projectId = null;
      let receiver = null;
      // Nếu là public request, cập nhật trạng thái sang Approved và tạo project mới
      if (request.isPublic && request.status !== RequestStatus.Approved) {
        if (!request.category?.id) {
          console.error('[PayPal] Request public thiếu category khi tạo project:', request);
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
            const createResult = await this.projectService.createProjectFromRequest(request, user.id);
            const newProject = await this.projectRepository.findOneOrFail({ where: { id: createResult.projectId } });
            request.project = newProject;
            projectId = newProject.id;
            receiver = request.assignee?.fullName || request.assignee?.email;
          } catch (err) {
            console.error('[PayPal] Error creating project from public request:', err);
            return {
              success: false,
              error: 'Payment succeeded but failed to create project: ' + (err?.message || err),
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
    const adminWallet = await this.walletManagerService.getOrCreateWallet(
      this.ADMIN_USER_ID
    );
    if (Number(adminWallet.balance) < amount) {
      throw new BadRequestException('Admin wallet has insufficient funds');
    }

    let request: RequestEntity | undefined = undefined;
    if (requestId) {
      request = await this.requestRepository.findOneOrFail({
        where: { id: requestId },
      });
    }

    // Debug: log giá trị paypalEmail khi tạo transaction
    console.log('Withdraw - paypalEmail:', paypalEmail, 'DTO:', dto);
    const transactionPayload: DeepPartial<TransactionEntity> = {
      user: userEntity,
      amount: -Math.abs(amount),
      status: TransactionStatus.Pending,
      paypalOrderId: paypalOrderId ?? undefined,
      request,
      paypalEmail,
    };

    const transaction = this.transactionRepo.create(transactionPayload);
    await this.transactionRepo.save(transaction);

    // Debug: log transaction sau khi lưu
    console.log('Saved transaction:', transaction);

    return transaction;
  }

  async approveWithdrawal(transactionId: number): Promise<TransactionEntity> {
    const transaction = await this.transactionRepo.findOneOrFail({
      where: { id: transactionId },
      relations: ['user', 'request', 'request.assignee'],
    });

    if (transaction.status !== TransactionStatus.Pending) {
      throw new BadRequestException('Transaction is not pending approval.');
    }

    const paypalEmail = transaction.user.email;
    const amount = Math.abs(Number(transaction.amount));

    // Luôn lấy access token mới cho payout
    const auth = Buffer.from(
      `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
    ).toString('base64');
    const tokenRes = await axios.post(
      `${process.env.PAYPAL_API}/v1/oauth2/token`,
      'grant_type=client_credentials',
      {
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );
    const accessToken = tokenRes.data.access_token;
    console.log('[PayPal] Access token:', accessToken.slice(0, 12) + '...');
    console.log(
      '[PayPal] Payout endpoint:',
      `${process.env.PAYPAL_API}/v1/payments/payouts`
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
        `${process.env.PAYPAL_API}/v1/payments/payouts`,
        payoutData,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (res.status !== 201) {
        throw new Error(
          'PayPal payout failed with status: ' + res.status
        );
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

      return transaction;
    } catch (err) {
      console.error('PayPal payout failed:', err);
      throw new InternalServerErrorException(
        'Failed to approve PayPal withdrawal'
      );
    }
  }

  async getAllPendingWithdrawals() {
    const txns = await this.transactionRepo
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.user', 'user')
      .where('t.amount < 0')
      .andWhere('t.status = :status', { status: TransactionStatus.Pending })
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

    await this.walletManagerService.addToBalance(
      request.assignee.id,
      transaction.amount
    );

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

}
