import { Controller, Post, Body, UseGuards, Req, Get } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt.guard';
import { PaypalService } from '../service/payment-manager.service';
import { UserEntity } from '../../db/mysql/entity';
import { WithdrawDto } from '../../dto/withdraw.dto';
import { WalletManagerService } from '../service/wallet-manager.service';

@ApiTags('Wallet')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('wallet')
export class WalletController {
  constructor(
    private readonly walletManagerService: WalletManagerService,
    private readonly paypalService: PaypalService
  ) {}

  @Get()
  async getWallet(@Req() req: { user: UserEntity }) {
    return this.walletManagerService.getOrCreateWallet(req.user.id);
  }

  @Post('withdraw')
  async withdraw(@Req() req: { user: UserEntity }, @Body() body: WithdrawDto) {
    const { amount, paypalEmail, requestId } = body;
    const transformedRequestId = requestId ? BigInt(requestId) : undefined;
    return this.paypalService.withdraw(
      req.user.id,
      amount,
      paypalEmail,
      transformedRequestId
    );
  }
}
