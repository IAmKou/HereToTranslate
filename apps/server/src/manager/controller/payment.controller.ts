import { Controller, Get, Query, Res } from '@nestjs/common';
import { PaypalService } from '#LocalProject/Managers/service/payment-manager.service';

@Controller('paypal')
export class PaymentController {
  constructor(private readonly paymentService: PaypalService) {}
  @UseGuards(JwtAuthGuard)
  @Get('success')
  async handlePaypalSuccess(@Query('token') orderId: string, @Res() res) {
    const captureResult =
      await this.paymentService.capturePaymentAndCreateProject(orderId);

    if (captureResult.success) {
      return res.redirect(`/project/${captureResult.projectId}`);
    } else {
      return res.redirect('/payment-failed');
    }
  }
}
