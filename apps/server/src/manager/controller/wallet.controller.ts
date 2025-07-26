import { Controller, Post, Body, UseGuards, Req, Get, Query, Res, Patch } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt.guard';
import { PaypalService } from '../service/payment-manager.service';
import { UserEntity } from '../../db/mysql/entity';
import { WithdrawDto } from '../../dto/withdraw.dto';
import { WalletManagerService } from '../service/wallet-manager.service';
import { Response } from 'express';
import axios from 'axios';

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
    const details = await this.walletManagerService.getWalletDetails(req.user.id);
    const latestTransaction = await this.walletManagerService.getLatestTransaction(req.user.id);
    return { ...details, latestTransaction };
  }

  @Post('withdraw')
  @UseGuards(JwtAuthGuard)
  async withdraw(
    @Req() req: { user: UserEntity },
    @Body() dto: WithdrawDto
  ) {
    return this.paypalService.withdraw(req.user.id, dto);
  }

  @Post('link-paypal')
  @UseGuards(JwtAuthGuard)
  async linkPaypal(
    @Req() req: { user: UserEntity },
    @Body('paypalEmail') paypalEmail: string
  ) {
    await this.walletManagerService.linkPaypal(req.user.id, paypalEmail);
    return { success: true, paypalEmail };
  }

  @Get('paypal/connect')
  @UseGuards(JwtAuthGuard)
  getPaypalConnectUrl(@Req() req: { user: UserEntity }) {
    const clientId = process.env.PAYPAL_CLIENT_ID;
    const redirectUri = encodeURIComponent(process.env.PAYPAL_REDIRECT_URI || '${import.meta.env.VITE_API_URL}/wallet/paypal/callback');
    const scope = encodeURIComponent('openid email');
    const state = encodeURIComponent(req.user.id.toString());
    const url = `https://www.sandbox.paypal.com/signin/authorize?client_id=${clientId}&response_type=code&scope=${scope}&redirect_uri=${redirectUri}&state=${state}`;
    return { url };
  }

  @Get('paypal/callback')
  async paypalCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response
  ) {
    if (!code || !state) return res.status(400).send('Missing code or state');
    try {
      const clientId = process.env.PAYPAL_CLIENT_ID;
      const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
      const redirectUri = process.env.PAYPAL_REDIRECT_URI || 'http://localhost:3000/api/wallet/paypal/callback';
      const tokenRes = await axios.post(
        'https://api.sandbox.paypal.com/v1/oauth2/token',
        new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: redirectUri,
        }),
        {
          auth: { username: clientId, password: clientSecret },
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        }
      );
      const accessToken = tokenRes.data.access_token;
      const userRes = await axios.get('https://api.sandbox.paypal.com/v1/identity/openidconnect/userinfo/?schema=openid', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const email = userRes.data.email;
      const userId = BigInt(state);
      await this.walletManagerService.linkPaypal(userId, email);
      return res.redirect('/wallet?paypal=success');
    } catch (err) {
      return res.redirect('/wallet?paypal=fail');
    }
  }

  @Patch('paypal-email')
  @UseGuards(JwtAuthGuard)
  async updatePaypalEmail(@Req() req: { user: UserEntity }, @Body('email') email: string) {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error('Invalid email');
    }
    // Lấy wallet theo user
    const wallet = await this.walletManagerService.getOrCreateWallet(req.user.id);
    await this.walletManagerService.updatePaypalEmailByWalletId(wallet.id, email);
    return { success: true, email };
  }

  @Get('pending-withdrawals')
  @UseGuards(JwtAuthGuard)
  async getPendingWithdrawals(@Req() req: { user: UserEntity }) {
    return this.walletManagerService.getPendingWithdrawals(req.user.id);
  }

  @Get('sync-balances')
  async syncBalances() {
    return this.walletManagerService.syncAllWalletBalances();
  }

  @Get('transactions')
  @UseGuards(JwtAuthGuard)
  async getUserTransactions(@Req() req: { user: UserEntity }) {
    return this.walletManagerService.getUserTransactions(req.user.id);
  }

}
