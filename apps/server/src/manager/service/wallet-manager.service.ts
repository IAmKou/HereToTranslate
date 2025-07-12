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
}
