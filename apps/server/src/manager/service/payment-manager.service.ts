import axios from 'axios';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import {
  RequestEntity,
  TransactionEntity,
  TransactionStatus,
  UserEntity,
} from '#LocalProject/Entities';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class PaypalService {
  private readonly api = process.env.PAYPAL_API;
  private accessToken: string;

  constructor(
    @InjectRepository(TransactionEntity)
    private transactionRepo: Repository<TransactionEntity>,
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
  ): Promise<string | null> {
    const accessToken = await this.getAccessToken();

    try {
      const res = await axios.post(
        `${this.api}/v2/checkout/orders`,
        {
          intent: 'CAPTURE',
          purchase_units: [
            {
              amount: {
                currency_code: 'USD',
                value: amount.toFixed(2),
              },
              description: `Deposit for request ID ${request.id}`,
            },
          ],
          application_context: {
            return_url: `https://your-site.com/paypal/success`,
            cancel_url: `https://your-site.com/paypal/cancel`,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const orderId = res.data.id;

      // Save transaction
      await this.transactionRepo.save({
        user,
        request,
        amount,
        status: TransactionStatus.Pending,
        paypalOrderId: orderId,
      });
      type PaypalLink = {
        href: string;
        rel: 'approve' | 'self' | 'capture' | string;
        method: 'GET' | 'POST' | string;
      };
      const approvalLink = (res.data.links as PaypalLink[]).find(
        (link: PaypalLink) => link.rel === 'approve'
      )?.href;
      return approvalLink || null;
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

      return null;
    }
  }

  async capturePaymentAndCreateProject(orderId: string): Promise<{ success: boolean; projectId?: number }> {
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

      const transaction = await this.transactionRepo.findOneOrFail({
        where: { paypalOrderId: orderId },
        relations: ['user', 'request'],
      });

      const { user: selectedUser, request } = transaction;

      const otherUserIds = request.registrants
        .map(user => Number(user.id))
        .filter(uid => uid !== Number(selectedUser.id));

      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        const createResult = await this.projectService.createProject(selectedUser.id, {
          name: request.title,
          description: request.description,
          isPrivate: true,
          tags: [],
          categoryId: request.category?.id?.toString() ?? '',
        });

        const newProject = await this.projectRepository.findOneOrFail({
          where: { id: createResult.projectId },
        });

        request.assignee = selectedUser;
        request.registrants = [];
        request.project = newProject;
        request.status = RequestStatus.Approved;
        transaction.status = TransactionStatus.Completed;

        await queryRunner.manager.save([request, transaction]);

        if (otherUserIds.length > 0) {
          await this.mailService.notifyAllOthersRequestTaken(request.id, otherUserIds);
          await this.notificationService.notifyAllOthers(request.id, otherUserIds);
        }

        await queryRunner.commitTransaction();

        return { success: true, projectId: newProject.id };
      } catch (err) {
        await queryRunner.rollbackTransaction();
        console.error('Project creation failed:', err);
        return { success: false };
      } finally {
        await queryRunner.release();
      }
    } catch (err) {
      console.error('PayPal capture failed:', err);
      return { success: false };
    }
  }

}
