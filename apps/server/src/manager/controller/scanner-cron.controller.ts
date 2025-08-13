import { Controller, Get, Post, Put, UseGuards, Body } from '@nestjs/common';
import { ScannerCronService } from '../service/scanner-cron.service';
import { JwtAuthGuard } from '../../auth/guards/jwt.guard';
import { ForRoles } from '../../auth/decorators/for-role.decorator';

@Controller('scanner-cron')
@UseGuards(JwtAuthGuard)
export class ScannerCronController {
  constructor(private readonly scannerCronService: ScannerCronService) {}

  @Get('status')
  @ForRoles(2, 1)
  getStatus() {
    return this.scannerCronService.getStatus();
  }

  @Post('trigger')
  @ForRoles(2, 1)
  async triggerManualScan() {
    try {
      await this.scannerCronService.triggerManualScan();
      return { 
        success: true, 
        message: 'Manual scan triggered successfully' 
      };
    } catch (error) {
      return { 
        success: false, 
        message: (error as Error).message || 'Failed to trigger manual scan' 
      };
    }
  }

  @Get('intervals')
  @ForRoles(2, 1)
  getAvailableIntervals() {
    return this.scannerCronService.getAvailableIntervals();
  }

  @Put('config')
  @ForRoles(2, 1)
  async updateConfig(@Body() config: { interval?: string; restTime?: number }) {
    try {
      const result = await this.scannerCronService.updateScanConfig(
        config.interval,
        config.restTime
      );
      return result;
    } catch (error) {
      return { 
        success: false, 
        message: (error as Error).message || 'Failed to update configuration' 
      };
    }
  }

  @Post('stop')
  @ForRoles(2, 1)
  stopCronJob() {
    return this.scannerCronService.stopCronJob();
  }

  @Post('start')
  @ForRoles(2, 1)
  startCronJob() {
    return this.scannerCronService.startCronJob();
  }
}
