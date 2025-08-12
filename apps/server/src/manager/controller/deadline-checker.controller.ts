import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { DeadlineCheckerService } from '../service/deadlinechecker.service';
import { JwtAuthGuard } from '../../auth/guards/jwt.guard';
import { ForRoles } from '../../auth/decorators/for-role.decorator';
import { UserRole } from '../../db/mysql/entity/user.entity';

@Controller('deadline-checker')
@UseGuards(JwtAuthGuard)
export class DeadlineCheckerController {
  constructor(private readonly deadlineCheckerService: DeadlineCheckerService) {}

  @Get('status')
  @ForRoles(UserRole.Admin)
  getCronStatus() {
    return this.deadlineCheckerService.getCronStatus();
  }

  @Post('trigger-minute-scan')
  @ForRoles(UserRole.Admin)
  async triggerManualMinuteScan() {
    try {
      await this.deadlineCheckerService.triggerManualMinuteScan();
      return { 
        success: true, 
        message: 'Manual minute scan triggered successfully' 
      };
    } catch (error) {
      return { 
        success: false, 
        message: (error as Error).message || 'Failed to trigger manual minute scan' 
      };
    }
  }

  @Post('stop-cron')
  @ForRoles(UserRole.Admin)
  stopCronJob() {
    return this.deadlineCheckerService.stopCronJob();
  }

  @Post('start-cron')
  @ForRoles(UserRole.Admin)
  startCronJob() {
    return this.deadlineCheckerService.startCronJob();
  }
}
