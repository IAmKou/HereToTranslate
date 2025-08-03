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

@ApiTags('Payment')
@ApiBearerAuth()
@Controller('payment')
export class PaymentController {
  constructor(private readonly paymentService: PaypalService) {}

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
    return this.paymentService.finalizeTranslation(requestId);
  }

  @Get('/paypal/success')
  async handlePayPalSuccess(@Query('token') orderId: string, @Res() res: Response) {
    const result = await this.paymentService.capturePaymentAndCreateProject(orderId);

    if (result.success) {
      return res.redirect(`http://localhost:4200/my-requests`);
    } else {
      return res.redirect('/payment-failed');
    }
  }

  @Get('/paypal/private/success')
  async handlePrivatePayPalSuccess(@Query('token') orderId: string, @Res() res: Response) {
    const result = await this.paymentService.capturePayment(orderId);

    if (result.success) {
      return res.redirect(`http://localhost:4200/my-requests`);
    } else {
      return res.redirect('/payment-failed');
    }
  }

  @UseGuards()
  @Get('/paypal/test')
  getTestRoute(@Res() res: Response) {
    return res.send('✅ Test route hit!');
  }

  @UseGuards(JwtAuthGuard)
  @Post(':transactionId/approve')
  async approveTransaction(@Param('transactionId') transactionId: number){
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
    try {
      const result = await this.paymentService.capturePayment(orderId);
      return result || { success: true };
    } catch (e) {
      return { success: false, message: e?.toString() || 'Capture failed' };
    }
  }

}
