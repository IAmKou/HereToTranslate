import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RoleEntity, UserEntity } from '#LocalProject/Entities';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class SeederService implements OnApplicationBootstrap {
  constructor(
    @InjectRepository(RoleEntity)
    private readonly roleRepo: Repository<RoleEntity>,
    @InjectRepository(UserEntity)
    private readonly accountRepo: Repository<UserEntity>,
  ) {}

  async onApplicationBootstrap() {
    await this.seedRoles();
    await this.seedAdminAccount();
  }

  private async seedRoles() {
    const roles = ['ADMIN', 'MEMBER'];
    for (const roleName of roles) {
      const exists = await this.roleRepo.findOne({ where: { name: roleName } });
      if (!exists) {
        await this.roleRepo.save({ name: roleName });
        console.log(`✅ Role created: ${roleName}`);
      }
    }
  }

  private async seedAdminAccount() {
      const existingAdmin = await this.accountRepo.findOne({ where: { username: 'admin' } });
      if (!existingAdmin) {
        const passwordHash = await bcrypt.hash('admin123', 10);

        const role = await this.roleRepo.findOneBy({ id: 1 });
        if (!role) {
          throw new Error("Admin role not found in roles table!");
        }

        const adminAccount = this.accountRepo.create({
          username: 'admin',
          passwordHash,
          email: 'admin@example.com',
          phone: '0123456789',
          fullName: 'System Admin',
          role,
          isActive: true,
          createdAt: new Date(),
        });

        await this.accountRepo.save(adminAccount);
        console.log(`✅ Admin account created: admin / admin123`);
      }
    }
}
