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
    }
  ) {
    await this.mailerService.sendMail({
      to,
      subject: `You're invited to join project: ${invitationData.projectName}`,
      template: './project-invitation',
      context: {
        projectName: invitationData.projectName,
        invitedByUsername: invitationData.invitedByUsername,
        message: invitationData.message || `You're invited to join the project ${invitationData.projectName}.`,
        projectId: invitationData.projectId,
      },
    });
  }
}
