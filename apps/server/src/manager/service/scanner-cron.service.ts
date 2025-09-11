import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression, SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';

@Injectable()
export class ScannerCronService {
  private readonly logger = new Logger(ScannerCronService.name);
  private isRunning = false;
  private cronJob: CronJob;
  private scanInterval = '0 * * * * *';
  private restTime = 10000;

  constructor(private readonly schedulerRegistry: SchedulerRegistry) {
    this.initializeCronJob();
  }

  private initializeCronJob() {
    this.cronJob = new CronJob(this.scanInterval, () => {
      this.handleScan();
    });

    this.schedulerRegistry.addCronJob('scanner-cron', this.cronJob);

    this.cronJob.start();
    this.logger.log(`Scanner cron job started with interval: ${this.scanInterval}`);
  }

  private async handleScan() {
    if (this.isRunning) {
      this.logger.warn('Previous scan still running, skipping this iteration');
      return;
    }

    this.isRunning = true;
    this.logger.log('Starting scheduled scan...');

    try {
      await this.performScan();

      this.logger.log(`Scan completed, resting for ${this.restTime / 1000} seconds...`);
      await this.sleep(this.restTime);

      this.logger.log('Rest period completed, ready for next scan');
    } catch (error) {
      this.logger.error('Error during scan:', error);
    } finally {
      this.isRunning = false;
    }
  }

  private async performScan() {
    this.logger.log('Performing scan operations...');

    await this.simulateScanWork();

    this.logger.log('Scan operations completed');
  }

  private async simulateScanWork() {
    const startTime = Date.now();

    await Promise.all([
      this.checkDatabaseRecords(),
      this.processPendingTasks(),
      this.cleanupExpiredData(),
    ]);

    const duration = Date.now() - startTime;
    this.logger.log(`Scan work completed in ${duration}ms`);
  }

  private async checkDatabaseRecords() {
    this.logger.debug('Checking database records...');
    await this.sleep(100);
  }

  private async processPendingTasks() {

    this.logger.debug('Processing pending tasks...');
    await this.sleep(150);
  }

  private async cleanupExpiredData() {
    this.logger.debug('Cleaning up expired data...');
    await this.sleep(200);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async triggerManualScan() {
    if (this.isRunning) {
      throw new Error('Scan is already running');
    }

    this.logger.log('Manual scan triggered');
    await this.handleScan();
  }

  updateScanConfig(interval?: string, restTime?: number) {
    if (interval) {
      this.scanInterval = interval;
      this.logger.log(`Updating scan interval to: ${interval}`);
    }

    if (restTime) {
      this.restTime = restTime;
      this.logger.log(`Updating rest time to: ${restTime}ms`);
    }

    this.cronJob.stop();
    this.schedulerRegistry.deleteCronJob('scanner-cron');
    this.initializeCronJob();

    return {
      success: true,
      message: 'Scan configuration updated successfully',
      newInterval: this.scanInterval,
      newRestTime: this.restTime
    };
  }

  stopCronJob() {
    this.cronJob.stop();
    this.logger.log('Scanner cron job stopped');
    return { success: true, message: 'Cron job stopped successfully' };
  }

  startCronJob() {
    this.cronJob.start();
    this.logger.log('Scanner cron job started');
    return { success: true, message: 'Cron job started successfully' };
  }

  getStatus() {
    return {
      isRunning: this.isRunning,
      lastScanTime: new Date().toISOString(),
      serviceName: 'ScannerCronService',
      cronJobStatus: (this.cronJob as any).running ? 'running' : 'stopped',
      scanInterval: this.scanInterval,
      restTime: this.restTime,
      nextScanTime: this.cronJob.nextDate().toString()
    };
  }

  getAvailableIntervals() {
    return {
      'Every minute': '0 * * * * *',
      'Every 5 minutes': '0 */5 * * * *',
      'Every 10 minutes': '0 */10 * * * *',
      'Every 30 minutes': '0 */30 * * * *',
      'Every hour': '0 0 * * * *',
      'Every day at midnight': '0 0 0 * * *'
    };
  }
}
