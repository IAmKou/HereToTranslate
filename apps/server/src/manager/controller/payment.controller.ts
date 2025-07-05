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

  @UseGuards()
  @Get('/paypal/test')
  getTestRoute(@Res() res: Response) {
    return res.send('✅ Test route hit!');
  }


}
