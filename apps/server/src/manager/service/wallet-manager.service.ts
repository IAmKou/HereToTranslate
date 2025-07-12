import { Injectable, BadRequestException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {}

  async onModuleInit() {
    await this.syncAllWalletBalances();
    console.log('Wallet balances synced on startup');
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

  // async testPermissions(
  //   projectId: bigint,
  //   uid: bigint,
  //   against: IntoPermission | IntoPermission[], // can be single or multiple
  //   requireAll: boolean = true // true: AND logic, false: OR logic
  // ): Promise<Permission> {
  //   const permissionsToCheck = Array.isArray(against) ? against.map(p => new Permission(p)) : [new Permission(against)];
  //
  //   this.logger.debug(
  //     `Checking if user [${uid}] has ${permissionsToCheck.map(p => p.toString()).join(', ')} for project [${projectId}]`
  //   );
  //
  //   const projectExists = await this.projectRepository.exists({ where: { id: BigInt(projectId) } });
  //   if (!projectExists) throw new NotFoundException(`Unknown project`);
  //
  //   const userExists = await this.userRepository.exists({ where: { id: BigInt(uid) } });
  //   if (!userExists) throw new NotFoundException(`Unknown user`);
  //
  //   const userPermissionFlags = await this.projectRoleRepository
  //     .createQueryBuilder('role')
  //     .innerJoin('role.users', 'user')
  //     .where('role.project = :projectId', { projectId })
  //     .andWhere('user.id = :userId', { userId: uid })
  //     .select([`BIT_OR(role.permissionFlags) as userPermissionFlags`])
  //     .getRawOne<{ userPermissionFlags: bigint }>()
  //     .then(result => new Permission(result?.userPermissionFlags ?? PermissionFlags.None));
  //
  //   const hasPermission = requireAll
  //     ? permissionsToCheck.every(p => p.applyMask(userPermissionFlags).value === p.value)
  //     : permissionsToCheck.some(p => p.applyMask(userPermissionFlags).value === p.value);
  //
  //   if (!hasPermission) {
  //     this.logger.debug(
  //       `User [${uid}] does not have required permissions [${permissionsToCheck.map(p => p.toString()).join(', ')}] for project [${projectId}]`
  //     );
  //     throw new ForbiddenException(`You do not have permission to perform this action`);
  //   }
  //
  //   return userPermissionFlags;
  // }

  async updatePaypalEmailByWalletId(walletId: number, paypalEmail: string): Promise<WalletEntity> {
    const wallet = await this.walletRepository.findOneOrFail({ where: { id: walletId } });
    wallet.paypalEmail = paypalEmail;
    return this.walletRepository.save(wallet);
  }

  async getWalletDetails(userId: bigint) {
    const wallet = await this.getOrCreateWallet(userId);
    // Tổng tiền đã nạp
    const totalDeposits = await this.transactionRepository
      .createQueryBuilder('t')
      .where('t.user = :userId', { userId })
      .andWhere('t.amount > 0')
      .andWhere('t.status IN (:...statuses)', { statuses: [TransactionStatus.Completed, TransactionStatus.Approved] })
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
      .andWhere('t.status IN (:...statuses)', { statuses: [TransactionStatus.Pending, TransactionStatus.InProgress, TransactionStatus.WaitingApproval] })
      .select('SUM(t.amount)', 'sum')
      .getRawOne();
    // Tính balance động
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
    const txn = await this.transactionRepository.findOne({
      where: { user: { id: userId } },
      order: { createdAt: 'DESC' },
    });
    if (!txn) return null;
    return {
      id: txn.id,
      amount: txn.amount,
      status: txn.status,
      createdAt: txn.createdAt instanceof Date ? txn.createdAt.toISOString() : txn.createdAt,
      type: txn.amount > 0 ? 'Deposit' : 'Withdraw',
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

  async linkPaypal(userId: bigint, paypalEmail: string) {
    const user = await this.userRepository.findOneOrFail({ where: { id: userId } });
    user.paypalEmail = paypalEmail;
    await this.userRepository.save(user);
  }

  async syncAllWalletBalances() {
    const wallets = await this.walletRepository.find({ relations: ['user'] });
    for (const wallet of wallets) {
      const totalDeposit = await this.transactionRepository
        .createQueryBuilder('t')
        .where('t.user = :userId', { userId: wallet.user.id })
        .andWhere('t.amount > 0')
        .andWhere('t.status IN (:...statuses)', { statuses: ['COMPLETED', 'APPROVED'] })
        .select('SUM(t.amount)', 'sum')
        .getRawOne();
      wallet.balance = Number(totalDeposit?.sum || 0);
      await this.walletRepository.save(wallet);
    }
    return { success: true };
  }

  // Lấy lịch sử giao dịch của user
  async getUserTransactions(userId: bigint) {
    const txns = await this.transactionRepository.find({
      where: { user: { id: userId } },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
    return txns.map(txn => ({
      ...txn,
      createdAt: txn.createdAt instanceof Date ? txn.createdAt.toISOString() : txn.createdAt,
    }));
  }

  // Lấy tất cả giao dịch (cho admin)
  async getAllTransactions() {
    const txns = await this.transactionRepository.find({
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
    return txns.map(txn => ({
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

    return queryBuilder.getMany();
  }
}
