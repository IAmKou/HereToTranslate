import { Injectable, BadRequestException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { WalletEntity } from '#LocalProject/Entities';
import { UserEntity } from '#LocalProject/Entities';
import { TransactionEntity, TransactionStatus } from '#LocalProject/Entities';

@Injectable()
export class WalletManagerService implements OnModuleInit {
  constructor(
    @InjectRepository(WalletEntity)
    private readonly walletRepository: Repository<WalletEntity>,
    @InjectRepository(TransactionEntity)
    private readonly transactionRepository: Repository<TransactionEntity>,
    // @InjectRepository(UserEntity)
    // private readonly userRepository: Repository<UserEntity>,
  ) {}

  async onModuleInit() {
    await this.syncAllWalletBalances();
  }

  async getOrCreateWallet(userId: bigint): Promise<WalletEntity> {
    let wallet = await this.walletRepository.findOne({
      where: { user: { id: userId } },
      relations: ['user'],
    });
    if (!wallet) {
      wallet = this.walletRepository.create({
        user: { id: userId } as UserEntity,
        balance: 0,
      });
      await this.walletRepository.save(wallet);
    }
    return wallet;
  }

  async addToBalance(userId: bigint, amount: number): Promise<WalletEntity> {
    if (amount <= 0) throw new BadRequestException('Amount must be positive');
    const wallet = await this.getOrCreateWallet(userId);
    wallet.balance = Number(wallet.balance) + Number(amount);
    return this.walletRepository.save(wallet);
  }

  async updatePaypalEmailByWalletId(walletId: number, paypalEmail: string): Promise<WalletEntity> {
    const wallet = await this.walletRepository.findOneOrFail({ where: { id: walletId } });
    wallet.paypalEmail = paypalEmail;
    return this.walletRepository.save(wallet);
  }

  async getWalletDetails(userId: bigint) {
    const wallet = await this.getOrCreateWallet(userId);
    // Tổng tiền đã nạp (tất cả transaction deposit, không lọc status)
    const totalDeposits = await this.transactionRepository
      .createQueryBuilder('t')
      .where('t.user = :userId', { userId })
      .andWhere('t.amount > 0')
      .select('SUM(t.amount)', 'sum')
      .getRawOne();
    // Tổng tiền đã rút
    const totalWithdrawn = await this.transactionRepository
      .createQueryBuilder('t')
      .where('t.user = :userId', { userId })
      .andWhere('t.amount < 0')
      .andWhere('t.status IN (:...statuses)', { statuses: [TransactionStatus.Completed, TransactionStatus.Approved] })
      .select('SUM(ABS(t.amount))', 'sum')
      .getRawOne();
    // Số tiền đang chờ rút
    const pendingWithdrawals = await this.transactionRepository
      .createQueryBuilder('t')
      .where('t.user = :userId', { userId })
      .andWhere('t.amount < 0')
      .andWhere('t.status = :pending', { pending: TransactionStatus.Pending })
      .select('SUM(ABS(t.amount))', 'sum')
      .getRawOne();
    // Số tiền đang giữ (hold) cho các yêu cầu chưa hoàn thành
    const holdAmount = await this.transactionRepository
      .createQueryBuilder('t')
      .where('t.user = :userId', { userId })
      .andWhere('t.status IN (:...statuses)', { statuses: [TransactionStatus.Pending, TransactionStatus.WaitingApproval] })
      .select('SUM(t.amount)', 'sum')
      .getRawOne();
    // Tính balance động (bao gồm cả ON_HOLD và APPROVED)
    const balance = Number(totalDeposits?.sum || 0) - Number(totalWithdrawn?.sum || 0);
    return {
      ...wallet,
      balance,
      totalDeposits: Number(totalDeposits?.sum || 0),
      totalWithdrawn: Number(totalWithdrawn?.sum || 0),
      pendingWithdrawals: Number(pendingWithdrawals?.sum || 0),
      holdAmount: Number(holdAmount?.sum || 0),
    };
  }

  async getLatestTransaction(userId: bigint) {
    const txns = await this.transactionRepository.find({
      where: {
        user: { id: userId },
        status: In([TransactionStatus.Completed, TransactionStatus.Approved]),
      },
      order: { createdAt: 'DESC' },
      relations: ['user', 'request'],
    });
    const txn = txns.find(t => Number(t.amount) !== 0);
    if (!txn) return null;

    // Xác định type dựa trên logic mới
    let type = 'Deposit';
    if (txn.amount < 0) {
      type = 'Withdraw';
    } else if (txn.amount > 0 && txn.request) {
      type = 'Payment';
    }

    return {
      id: txn.id,
      amount: txn.amount,
      status: txn.status,
      createdAt: txn.createdAt instanceof Date ? txn.createdAt.toISOString() : txn.createdAt,
      type: type,
    };
  }

  async getPendingWithdrawals(userId: bigint): Promise<TransactionEntity[]> {
    return this.transactionRepository.createQueryBuilder('t')
      .where('t.userId = :userId', { userId })
      .andWhere('t.amount < 0')
      .andWhere('t.status = :status', { status: TransactionStatus.Pending })
      .orderBy('t.createdAt', 'DESC')
      .getMany();
  }

  // async linkPaypal(userId: bigint, paypalEmail: string) {
  //   const user = await this.userRepository.findOneOrFail({ where: { id: userId } });
  //   user.paypalEmail = paypalEmail;
  //   await this.userRepository.save(user);
  // }

  // Đồng bộ balance cho tất cả ví dựa trên transaction deposit đã hoàn thành
  async syncAllWalletBalances() {
    const wallets = await this.walletRepository.find({ relations: ['user'] });
    for (const wallet of wallets) {
      const totalDeposit = await this.transactionRepository
        .createQueryBuilder('t')
        .where('t.user = :userId', { userId: wallet.user.id })
        .andWhere('t.amount > 0')
        .andWhere('t.status IN (:...statuses)', { statuses: ['APPROVED'] }) // Only APPROVED deposits are released
        .select('SUM(t.amount)', 'sum')
        .getRawOne();
      wallet.balance = Number(totalDeposit?.sum || 0);
      await this.walletRepository.save(wallet);
    }
    return { success: true };
  }

  // Lấy lịch sử giao dịch của user bằng queryBuilder để lấy requesterId raw
  async getUserTransactions(userId: bigint) {
    console.log('getUserTransactions userId:', userId, typeof userId);
    const qb = this.transactionRepository.createQueryBuilder('t')
      .leftJoinAndSelect('t.user', 'user')
      .leftJoinAndSelect('t.request', 'request')
      .leftJoinAndSelect('request.assignee', 'assignee')
      .leftJoinAndSelect('request.project', 'project')
      .leftJoinAndSelect('project.createdBy', 'projectCreator')
      .addSelect('request.requesterId', 'request_requesterId')
      .where('user.id = :userId', { userId: Number(userId) })
      .orderBy('t.createdAt', 'DESC');
    const txnsRaw = await qb.getRawAndEntities();
    const mappedTxns = txnsRaw.entities.map((txn, idx) => {
      const requesterId = String(txnsRaw.raw[idx]['request_requesterId']);
      const userId = String(txn.user?.id);
      const result = userId === requesterId;
      // Populate project info if available
      let project = undefined;
      if (txn.request && txn.request.project) {
        project = {
          id: txn.request.project.id?.toString() || null,
          name: txn.request.project.name || null,
          status: txn.request.project.status || null,
          assignee: txn.request.project.assignee ? {
            id: txn.request.project.assignee.id?.toString() || null,
            fullName: txn.request.project.assignee.fullName || null,
            email: txn.request.project.assignee.email || null,
            phone: txn.request.project.assignee.phone || null
          } : null
        };
      }
      return {
        ...txn,
        createdAt: txn.createdAt instanceof Date ? txn.createdAt.toISOString() : txn.createdAt,
        paypalEmail: txn.paypalEmail || txn.user?.paypalEmail || null,
        status: (txn.amount > 0 && txn.status !== TransactionStatus.Approved && txn.status !== TransactionStatus.Completed) ? TransactionStatus.On_Hold : txn.status,
        requestId: txn.request?.id?.toString() || null,
        isRequester: result,
        request: txn.request ? {
          ...txn.request,
          project
        } : undefined,
        debug: {
          hasRequest: !!txn.request,
          hasAssignee: !!txn.request?.assignee,
          assigneeId: txn.request?.assignee?.id,
          userId: txn.user?.id,
          isAssignee: txn.request?.assignee?.id === txn.user?.id
        }
      };
    });

    console.log('✅ getUserTransactions for userId:', userId, 'Found transactions:', mappedTxns.map(t => ({
      id: t.id,
      amount: t.amount,
      status: t.status,
      requestId: t.requestId,
      isRequester: t.isRequester,
      userEmail: t.user?.email,
      type: t.amount > 0 ? (t.requestId ? (t.isRequester ? 'Deposit' : 'Payment') : 'Deposit') : 'Withdrawal',
      debug: t.debug
    })));

    return mappedTxns;
  }

  // Lấy tất cả giao dịch (cho admin)
  async getAllTransactions() {
    const txns = await this.transactionRepository.find({
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
    return txns.map((txn: any) => ({
      ...txn,
      createdAt: txn.createdAt instanceof Date ? txn.createdAt.toISOString() : txn.createdAt,
    }));
  }

  // Lấy giao dịch theo filter (cho admin)
  async getTransactionsWithFilters(filters: {
    userId?: bigint;
    type?: string;
    status?: string;
    minAmount?: number;
    maxAmount?: number;
    startDate?: Date;
    endDate?: Date;
  }) {
    const queryBuilder = this.transactionRepository.createQueryBuilder('t')
      .leftJoinAndSelect('t.user', 'user')
      .leftJoinAndSelect('t.request', 'request')
      .leftJoinAndSelect('request.project', 'project')
      .orderBy('t.createdAt', 'DESC');

    if (filters.userId) {
      queryBuilder.andWhere('t.user.id = :userId', { userId: filters.userId });
    }

    if (filters.type) {
      if (filters.type === 'deposit') {
        queryBuilder.andWhere('t.amount > 0');
      } else if (filters.type === 'withdraw') {
        queryBuilder.andWhere('t.amount < 0');
      }
    }

    if (filters.status) {
      queryBuilder.andWhere('t.status = :status', { status: filters.status });
    }

    if (filters.minAmount !== undefined) {
      queryBuilder.andWhere('ABS(t.amount) >= :minAmount', { minAmount: filters.minAmount });
    }

    if (filters.maxAmount !== undefined) {
      queryBuilder.andWhere('ABS(t.amount) <= :maxAmount', { maxAmount: filters.maxAmount });
    }

    if (filters.startDate) {
      queryBuilder.andWhere('t.createdAt >= :startDate', { startDate: filters.startDate });
    }

    if (filters.endDate) {
      queryBuilder.andWhere('t.createdAt <= :endDate', { endDate: filters.endDate });
    }

    const txns = await queryBuilder.getMany();
    return txns.map(txn => ({
      ...txn,
      createdAt: txn.createdAt instanceof Date ? txn.createdAt.toISOString() : txn.createdAt,
      requestId: txn.request?.id?.toString() || null,
      projectId: txn.request?.project?.id?.toString() || null,
    }));
  }
}
