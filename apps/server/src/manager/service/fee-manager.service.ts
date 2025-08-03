import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SettingsEntity } from '#LocalProject/Entities';

const DEFAULT_FEE_KEY = 'default_fee_percentage';

@Injectable()
export class FeeService {
  constructor(
    @InjectRepository(SettingsEntity)
    private settingsRepo: Repository<SettingsEntity>,
  ) {}

  async getDefaultFee(): Promise<number> {
    const setting = await this.settingsRepo.findOne({ where: { key: DEFAULT_FEE_KEY } });
    return setting ? Number(setting.value) : 5.0; // fallback to 5% if not set
  }

  async setDefaultFee(feePercentage: number): Promise<SettingsEntity> {
    if (feePercentage < 0 || feePercentage > 100) {
      throw new Error('Fee must be between 0 and 100');
    }

    let setting = await this.settingsRepo.findOne({ where: { key: DEFAULT_FEE_KEY } });
    if (!setting) {
      setting = this.settingsRepo.create({ key: DEFAULT_FEE_KEY, value: feePercentage });
    } else {
      setting.value = feePercentage;
    }

    return this.settingsRepo.save(setting);
  }
}
