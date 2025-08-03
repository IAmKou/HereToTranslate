import { Controller, Get, UseGuards, Query, Post, Param } from '@nestjs/common';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt.guard';
import { RolesGuard } from '../../auth/guards/role.guard';
import { ForRoles } from '../../auth/decorators/for-role.decorator';
import { WalletManagerService } from '../service/wallet-manager.service';
import { UserManagerService } from '../service/user-manager.service';

@ApiTags('Admin Transactions')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@ForRoles(2, 1) // 1 = super_admin, 2 = admin
@Controller('admin/transactions')
export class AdminTransactionController {
  constructor(
    private readonly walletManagerService: WalletManagerService,
    private readonly userManagerService: UserManagerService
  ) {}

  @Get()
  async getAllTransactions(
    @Query('userId') userId?: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('minAmount') minAmount?: string,
    @Query('maxAmount') maxAmount?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const filters: any = {};

    if (userId) {
      filters.userId = BigInt(userId);
    }

    if (type) {
      filters.type = type;
    }

    if (status) {
      filters.status = status;
    }

    if (minAmount) {
      filters.minAmount = parseFloat(minAmount);
    }

    if (maxAmount) {
      filters.maxAmount = parseFloat(maxAmount);
    }

    if (startDate) {
      filters.startDate = new Date(startDate);
    }

    if (endDate) {
      filters.endDate = new Date(endDate);
    }

    return this.walletManagerService.getTransactionsWithFilters(filters);
  }

  @Get('users')
  async getAllUsers() {
    return this.userManagerService.getAllUsers();
  }

  @Post(':id/approve')
  async approveTransaction(@Param('id') id: string) {
    // TODO: Implement approve transaction logic
    return { success: true, message: 'Transaction approved' };
  }

  @Post(':id/reject')
  async rejectTransaction(@Param('id') id: string) {
    // TODO: Implement reject transaction logic
    return { success: true, message: 'Transaction rejected' };
  }
}
