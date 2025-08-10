import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailService {
  constructor(private readonly mailerService: MailerService) {}

  async sendPrivateRequestConfirmation(to: string, requestData: { title: string; deadline: Date; username : string }) {
    await this.mailerService.sendMail({
      to,
      subject: 'Private Request Confirmation',
      template: './private-request-confirmation',
      context: {
        title: requestData.title,
        deadline: requestData.deadline.toDateString(),
        username: requestData.username,
      },
    });
  }

  async notifyRequesterOfRegistration(to: string, username : string){
    await this.mailerService.sendMail({
      to,
      subject: 'Registration',
      template: './register-request',
      context: {
        username,
      }
    })
  }

  async notifyAllOthersRequestTaken(requestId: number, userIds: number[]) {
    // TODO: Implement actual mail notification logic for all other registrants
    return;
  }

  async sendProjectInvitation(
    to: string,
    invitationData: {
      projectName: string;
      invitedByUsername: string;
      message?: string;
      projectId: string;
      expiresIn?: number;
    }
  ) {
    console.log('📧 MailService.sendProjectInvitation called with:', {
      to,
      invitationData
    });

    try {
      await this.mailerService.sendMail({
        to,
        subject: `You're invited to join project: ${invitationData.projectName}`,
        template: './project-invitation',
        context: {
          projectName: invitationData.projectName,
          invitedByUsername: invitationData.invitedByUsername,
          message: invitationData.message || `You're invited to join the project ${invitationData.projectName}.`,
          projectId: invitationData.projectId,
          expiresIn: invitationData.expiresIn,
        },
      });
      console.log('📧 MailService.sendProjectInvitation completed successfully');
    } catch (error) {
      console.error('📧 MailService.sendProjectInvitation error:', error);
      throw error;
    }
  }

  async sendTaskAssignmentNotification(
    to: string,
    taskData: {
      taskTitle: string;
      role: string;
      assignedBy: string;
      dueDate?: Date;
      notes?: string;
      reason?: string;
    }
  ) {
    console.log('📧 MailService.sendTaskAssignmentNotification called with:', {
      to,
      taskData
    });

    try {
      const subject = taskData.reason 
        ? `Task Reassigned: ${taskData.taskTitle}`
        : `New Task Assignment: ${taskData.taskTitle}`;

      await this.mailerService.sendMail({
        to,
        subject,
        template: './task-assignment',
        context: {
          taskTitle: taskData.taskTitle,
          role: taskData.role,
          assignedBy: taskData.assignedBy,
          dueDate: taskData.dueDate ? taskData.dueDate.toDateString() : 'Not specified',
          notes: taskData.notes || 'No additional notes',
          reason: taskData.reason || null,
          isReassignment: !!taskData.reason,
        },
      });
      console.log('📧 MailService.sendTaskAssignmentNotification completed successfully');
    } catch (error) {
      console.error('📧 MailService.sendTaskAssignmentNotification error:', error);
      throw error;
    }
  }
}
