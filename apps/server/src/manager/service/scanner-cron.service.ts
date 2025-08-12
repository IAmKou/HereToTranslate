import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression, SchedulerRegistry } from '@nestjs/schedule';
import { CronJob } from 'cron';

@Injectable()
export class ScannerCronService {
  private readonly logger = new Logger(ScannerCronService.name);
  private isRunning = false;
  private cronJob: CronJob;
  private scanInterval = '0 * * * * *'; // 每分钟执行一次
  private restTime = 10000; // 10秒休息时间

  constructor(private readonly schedulerRegistry: SchedulerRegistry) {
    this.initializeCronJob();
  }

  private initializeCronJob() {
    // 创建自定义的cron作业
    this.cronJob = new CronJob(this.scanInterval, () => {
      this.handleScan();
    });

    // 注册到调度器
    this.schedulerRegistry.addCronJob('scanner-cron', this.cronJob);
    
    // 启动cron作业
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
      // 执行扫描逻辑
      await this.performScan();
      
      // 扫描完成后休息指定时间
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
    
    // 在这里添加您的扫描逻辑
    // 例如：
    // - 检查数据库记录
    // - 处理队列任务
    // - 清理过期数据
    // - 发送通知
    // - 等等...
    
    // 模拟一些扫描工作
    await this.simulateScanWork();
    
    this.logger.log('Scan operations completed');
  }

  private async simulateScanWork() {
    // 模拟扫描工作，这里可以替换为实际的业务逻辑
    const startTime = Date.now();
    
    // 模拟一些异步操作
    await Promise.all([
      this.checkDatabaseRecords(),
      this.processPendingTasks(),
      this.cleanupExpiredData(),
    ]);
    
    const duration = Date.now() - startTime;
    this.logger.log(`Scan work completed in ${duration}ms`);
  }

  private async checkDatabaseRecords() {
    // 检查数据库记录的示例逻辑
    this.logger.debug('Checking database records...');
    await this.sleep(100); // 模拟数据库查询
  }

  private async processPendingTasks() {
    // 处理待处理任务的示例逻辑
    this.logger.debug('Processing pending tasks...');
    await this.sleep(150); // 模拟任务处理
  }

  private async cleanupExpiredData() {
    // 清理过期数据的示例逻辑
    this.logger.debug('Cleaning up expired data...');
    await this.sleep(200); // 模拟清理操作
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // 手动触发扫描的方法
  async triggerManualScan() {
    if (this.isRunning) {
      throw new Error('Scan is already running');
    }
    
    this.logger.log('Manual scan triggered');
    await this.handleScan();
  }

  // 更新扫描配置的方法
  updateScanConfig(interval?: string, restTime?: number) {
    if (interval) {
      this.scanInterval = interval;
      this.logger.log(`Updating scan interval to: ${interval}`);
    }
    
    if (restTime) {
      this.restTime = restTime;
      this.logger.log(`Updating rest time to: ${restTime}ms`);
    }

    // 重新创建cron作业
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

  // 停止cron作业
  stopCronJob() {
    this.cronJob.stop();
    this.logger.log('Scanner cron job stopped');
    return { success: true, message: 'Cron job stopped successfully' };
  }

  // 启动cron作业
  startCronJob() {
    this.cronJob.start();
    this.logger.log('Scanner cron job started');
    return { success: true, message: 'Cron job started successfully' };
  }

  // 获取服务状态的方法
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

  // 获取可用的预设间隔
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
