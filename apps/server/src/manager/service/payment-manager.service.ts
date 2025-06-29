import axios from 'axios';
import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';

@Injectable()
export class PaypalService {
  private readonly api = process.env.PAYPAL_API;
  private accessToken: string;

  private async getAccessToken(): Promise<string> {
    if (this.accessToken) return this.accessToken;

    const auth = Buffer.from(`${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`).toString('base64');

    try {
      const res = await axios.post(`${this.api}/v1/oauth2/token`, 'grant_type=client_credentials', {
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });

      this.accessToken = res.data.access_token;
      return this.accessToken;
    } catch (err) {
      console.error(err);
      throw new InternalServerErrorException('Failed to authenticate with PayPal');
    }
  }

  async createDeposit(amount: number, user: any): Promise<boolean> {
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
              description: `Deposit for request by ${user.username}`,
            },
          ],
          payer: {
            email_address: user.email,
          },
          application_context: {
            return_url: 'https://your-site.com/paypal/success',
            cancel_url: 'https://your-site.com/paypal/cancel',
          },
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      type PaypalLink = {
        href: string;
        rel: 'approve' | 'self' | 'capture' | string;
        method: 'GET' | 'POST' | string;
      };

      const approvalLink = (res.data.links as PaypalLink[]).find(
        (link: PaypalLink) => link.rel === 'approve'
      )?.href;

      if (!approvalLink) {
        throw new NotFoundException('No approval link returned from PayPal');
      }

      console.log('Redirect user to PayPal:', approvalLink);
      return true;
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

      return false;
    }

  }
}
