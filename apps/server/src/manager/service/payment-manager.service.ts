import axios from 'axios';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
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
import { Repository } from 'typeorm';
import { ProjectManagerService } from '#LocalProject/Managers/service/project-manager.service';
import { MailService } from '../../mailer/mailer.service';
import { TranslationApprovalEntity } from '#LocalProject/Entities';
import { WalletManagerService } from './wallet-manager.service';

@Injectable()
export class PaypalService {
  private readonly api = process.env.PAYPAL_API;
  private accessToken: string;

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
    private readonly projectService: ProjectManagerService,
    private readonly mailService: MailService,
    private readonly walletManagerService: WalletManagerService
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
    const parsedAmount =
      typeof amount === 'number' ? amount : parseFloat(amount as any);

    if (isNaN(parsedAmount)) {
      throw new BadRequestException('Invalid amount for PayPal deposit');
    }

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
                value: parsedAmount.toFixed(2),
              },
              description: `Deposit for request ID ${request.id}`,
            },
          ],
          application_context: {
            return_url: `http://localhost:3000/api/payment/paypal/success`,
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
        throw new InternalServerErrorException('No approval URL returned by PayPal.');
      }

      // Save transaction
      await this.transactionRepo.save({
        user,
        request,
        amount: parsedAmount,
        status: TransactionStatus.Pending,
        paypalOrderId: data.id,
      });

      return approvalUrl;
    } catch (err: unknown) {
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

  async capturePaymentAndCreateProject(
    orderId: string
  ): Promise<{
    success: boolean;
    projectId?: bigint;
    requestId?: bigint;
    amount?: number;
    currency?: string;
    payerEmail?: string;
    receiver?: string;
    date?: Date;
    description?: string;
    error?: string;
  }> {
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
        relations: ['user', 'request', 'request.registrants', 'request.category'],
      });

      const { user: selectedUser, request } = transaction;

      const otherUserIds = request.registrants
        .map((user) => Number(user.id))
        .filter((uid) => uid !== Number(selectedUser.id));

      const queryRunner = this.projectService['dataSource'].createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        const createProjectDto: any = {
          name: request.title,
          description: request.description,
          isPrivate: true,
          tags: [],
        };
        if (request.category?.id) {
          createProjectDto.categoryId = request.category.id.toString();
        }
        console.log('createProjectDto:', createProjectDto);
        const createResult = await this.projectService.createProject(
          selectedUser.id,
          createProjectDto
        );

        const newProject = await this.projectRepository.findOneOrFail({
          where: { id: createResult.projectId },
        });

        request.assignee = selectedUser;
        request.registrants = [];
        request.project = newProject;
        request.status = RequestStatus.Approved;
        if (request.status !== RequestStatus.Pending) {
          request.isPublic = false;
        }
        transaction.status = TransactionStatus.Completed;

        await queryRunner.manager.save([request, transaction]);

        if (otherUserIds.length > 0) {
          await this.mailService.notifyAllOthersRequestTaken(
            Number(request.id),
            otherUserIds
          );
          // await this.notificationService.notifyAllOthers(request.id, otherUserIds);
        }

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
        if (err instanceof Error) {
          console.error('Error stack:', err.stack);
        }
        return { success: false, error: (err as any)?.message || 'Project creation failed' };
      } finally {
        await queryRunner.release();
      }
    } catch (err) {
      console.error('PayPal capture failed:', err);
      return { success: false, error: (err as any)?.message || 'PayPal capture failed' };
    }
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

    let approval = await this.translationApprovalRepository.findOne({
      where: { request: { id: requestId }, user: { id: userId } },
      relations: ['request', 'user'],
    });
    if (!approval) {
      approval = this.translationApprovalRepository.create({
        request,
        user: { id: userId } as any,
        isApproved: true,
      });
    } else {
      approval.isApproved = true;
    }
    await this.translationApprovalRepository.save(approval);
    return true;
  }

  async withdraw(
    userId: bigint,
    amount: number,
    paypalEmail: string,
    requestId?: bigint
  ): Promise<WalletEntity> {
    if (amount <= 0) throw new BadRequestException('Amount must be positive');
    if (!paypalEmail || !paypalEmail.includes('@')) {
      throw new BadRequestException('Invalid PayPal email address');
    }

    const wallet = await this.walletManagerService.getOrCreateWallet(userId);
    if (Number(wallet.balance) < amount) {
      throw new BadRequestException('Insufficient balance');
    }

    let request: RequestEntity | undefined;
    if (requestId) {
      const found = await this.requestRepository.findOneBy({ id: requestId });
      if (!found) {
        throw new NotFoundException(`Request with ID ${requestId} not found.`);
      }
      request = found;
    }

    const accessToken = await this.getAccessToken();

    const payoutData = {
      sender_batch_header: {
        sender_batch_id: `batch_${Date.now()}`,
        email_subject: 'You have a payout!',
        email_message: 'You have received a payout via PayPal.',
      },
      items: [
        {
          recipient_type: 'EMAIL',
          amount: {
            value: amount.toFixed(2),
            currency: 'USD',
          },
          note: 'Withdrawal from Translation Platform',
          sender_item_id: `user_${userId}_${Date.now()}`,
          receiver: paypalEmail,
        },
      ],
    };

    try {
      const res = await axios.post(
        'https://api-m.paypal.com/v1/payments/payouts',
        payoutData,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const payoutBatchId = res.data.batch_header?.payout_batch_id ?? null;

      const transaction = this.transactionRepo.create({
        user: { id: userId } as UserEntity,
        amount,
        status: TransactionStatus.Completed,
        paypalOrderId: payoutBatchId,
      });

      if (request) {
        transaction.request = request;
      }

      await this.transactionRepo.save(transaction);

      wallet.balance = Number(wallet.balance) - Number(amount);
      return await this.walletRepository.save(wallet);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        const data = err.response?.data;

        console.error('PayPal API error:');
        console.error('Status:', status);
        console.error('Data:', JSON.stringify(data, null, 2));
        console.error('Message:', err.message);
      } else {
        console.error('Unexpected error:', err);
      }
      throw new InternalServerErrorException('Payout failed.');
    }
  }
}

