import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WalletEntity } from '#LocalProject/Entities';
import { UserEntity } from '#LocalProject/Entities';

@Injectable()
export class WalletManagerService {
  constructor(
    @InjectRepository(WalletEntity)
    private readonly walletRepository: Repository<WalletEntity>
  ) {}

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
}
