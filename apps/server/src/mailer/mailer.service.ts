
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
}
