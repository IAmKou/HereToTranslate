import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  Query,
  Res,
  Param,
  Get,
  HttpException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt.guard';
import { PaypalService } from '../service/payment-manager.service';
import { UserEntity } from '../../db/mysql/entity';
import { BigIntTransformPipe } from '../../util/pipes/bigint-transform.pipe';
import type { Response } from 'express';
import { ConfigService } from '@nestjs/config';

@ApiTags('Payment')
@ApiBearerAuth()
@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaypalService, private readonly configService: ConfigService) { }

  @UseGuards(JwtAuthGuard)
  @Post('approve-translation')
  async approveTranslation(
    @Req() req: { user: UserEntity },
    @Body('requestId', BigIntTransformPipe) requestId: bigint
  ) {
    return this.paymentService.approveTranslation(requestId, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('finalize-translation/:requestId')
  async finalizeTranslation(
    @Param('requestId', BigIntTransformPipe) requestId: bigint
  ) {
    // Create PayPal order for final 50% and return approval URL
    return this.paymentService.createFinalPaymentOrder(requestId);
  }

  @Get('/paypal/success')
  async handlePayPalSuccess(@Query('token') orderId: string, @Res() res: Response) {
    const result = await this.paymentService.capturePaymentAndCreateProject(orderId);

    if (result.success) {
      const clientUrl = (this.configService.get('CLIENT_URL') || 'http://localhost:4200').replace(/\/+$/, '');
      return res.redirect(`${clientUrl}/my-requests`);
    } else {
      return res.redirect('/payment-failed');
    }
  }

  @Get('/paypal/private/success')
  async handlePrivatePayPalSuccess(@Query('token') orderId: string, @Res() res: Response) {
    const result = await this.paymentService.capturePayment(orderId);

    if (result.success) {
      const clientUrl = (process.env.CLIENT_URL || 'http://localhost:4200').replace(/\/+$/, '');
      return res.redirect(`${clientUrl}/my-requests`);
    } else {
      return res.redirect('/payment-failed');
    }
  }

  // Final 50% success callback - redirect to frontend like deposit flow
  @Get('/paypal/final/success')
  async handleFinalPayPalSuccess(@Req() req: { query: Record<string, string> }, @Res() res: Response) {
    try {
      console.log('🔍 [PAYMENT CONTROLLER] ===========================================');
      console.log('🔍 [PAYMENT CONTROLLER] FINAL PAYMENT SUCCESS CALLBACK STARTED');
      console.log('🔍 [PAYMENT CONTROLLER] ===========================================');
      console.log('🔍 [PAYMENT CONTROLLER] orderId from query:', req.query.token);
      console.log('🔍 [PAYMENT CONTROLLER] Full query params:', JSON.stringify(req.query, null, 2));

      const result = await this.paymentService.captureFinalPayment(req.query.token);
      console.log('🔍 [PAYMENT CONTROLLER] captureFinalPayment result:', JSON.stringify(result, null, 2));

      // Redirect to frontend PayPal final success view with payment details
      const clientUrl = (this.configService.get('CLIENT_URL') || 'http://localhost:4200').replace(/\/+$/, '');
      console.log('🔍 [PAYMENT CONTROLLER] Client URL:', clientUrl);

      const redirectUrl = `${clientUrl}/paypal-final-success?token=${req.query.token}&requestId=${result.requestId || 'unknown'}&amount=${result.finalAmount || '0'}&currency=USD&depositAmount=${result.depositAmount || '0'}&totalAmount=${result.paidToTranslator || '0'}`;

      console.log('🔍 [PAYMENT CONTROLLER] Constructed redirect URL:', redirectUrl);
      console.log('🔍 [PAYMENT CONTROLLER] URL parameters breakdown:', {
        token: req.query.token,
        requestId: result.requestId || 'unknown',
        amount: result.finalAmount || '0',
        currency: 'USD',
        depositAmount: result.depositAmount || '0',
        totalAmount: result.paidToTranslator || '0'
      });

      console.log('🔍 [PAYMENT CONTROLLER] Redirecting to frontend success view...');
      return res.redirect(redirectUrl);

    } catch (e) {
      console.error('🔍 [PAYMENT CONTROLLER] Final payment capture failed:', e);
      console.error('🔍 [PAYMENT CONTROLLER] Error stack:', e instanceof Error ? e.stack : 'No stack trace');

      const clientUrl = (this.configService.get('CLIENT_URL') || 'http://localhost:4200').replace(/\/+$/, '');
      const errorRedirectUrl = `${clientUrl}/my-requests?finalPayment=fail&error=${encodeURIComponent(e.message || 'Unknown error')}`;

      console.log('🔍 [PAYMENT CONTROLLER] Redirecting to error page:', errorRedirectUrl);
      return res.redirect(errorRedirectUrl);
    }
  }

  @Get('/paypal/final/cancel')
  async handleFinalPayPalCancel(@Query('requestId') requestId: string, @Res() res: Response) {
    const clientUrl = (this.configService.get('CLIENT_URL') || 'http://localhost:4200').replace(/\/+$/, '');
    const redirectUrl = requestId
      ? `${clientUrl}/paypal-final-cancel?requestId=${requestId}`
      : `${clientUrl}/paypal-final-cancel`;
    return res.redirect(redirectUrl);
  }

  @UseGuards()
  @Get('/paypal/test')
  getTestRoute(@Res() res: Response) {
    return res.send('✅ Test route hit!');
  }

  @UseGuards(JwtAuthGuard)
  @Post(':transactionId/approve')
  async approveTransaction(@Param('transactionId') transactionId: number) {
    return this.paymentService.approveWithdrawal(transactionId);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':transactionId/reject')
  async rejectTransaction(@Param('transactionId') transactionId: number) {
    return this.paymentService.rejectWithdrawal(transactionId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('withdrawals/pending')
  async getAllPendingWithdrawals() {
    // Lấy tất cả transaction rút tiền pending
    return this.paymentService.getAllPendingWithdrawals();
  }

  @Post('paypal/capture')
  async capturePaypalPayment(@Body('orderId') orderId: string) {
    if (!orderId) {
      throw new HttpException('Missing orderId', 400);
    }
    // Gọi capturePayment, có thể tuỳ chỉnh nếu cần phân biệt loại giao dịch
    try {
      const result = await this.paymentService.capturePayment(orderId);
      return result || { success: true };
    } catch (e) {
      return { success: false, message: e?.message || 'Capture failed' };
    }
  }

}
