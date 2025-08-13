import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { TaskManagerService } from './task-manager.service';
import { SubtaskManagerService } from './subtask-manager.service';

@Injectable()
export class OverdueCheckerService {
  private readonly logger = new Logger(OverdueCheckerService.name);

  constructor(
    private readonly taskManagerService: TaskManagerService,
    private readonly subtaskManagerService: SubtaskManagerService,
  ) {}

  @Cron(CronExpression.EVERY_HOUR)
  async checkOverdueTasks() {
    this.logger.log('Checking for overdue tasks and subtasks...');
    
    try {
      const taskResult = await this.taskManagerService.checkAndUpdateOverdueStatus();
      const subtaskResult = await this.subtaskManagerService.checkAndUpdateOverdueStatus();
      
      this.logger.log(`Updated ${taskResult.tasksUpdated} overdue tasks and ${subtaskResult.subtasksUpdated} overdue subtasks`);
    } catch (error) {
      this.logger.error('Error checking overdue tasks:', error);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async dailyOverdueReport() {
    this.logger.log('Running daily overdue report...');
    
    try {
      const taskResult = await this.taskManagerService.checkAndUpdateOverdueStatus();
      const subtaskResult = await this.subtaskManagerService.checkAndUpdateOverdueStatus();
      
      this.logger.log(`Daily report: ${taskResult.tasksUpdated} overdue tasks and ${subtaskResult.subtasksUpdated} overdue subtasks found`);
    } catch (error) {
      this.logger.error('Error in daily overdue report:', error);
    }
  }
}
