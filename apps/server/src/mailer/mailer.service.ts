
import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class MailService {
  constructor(private readonly mailerService: MailerService) {}

  async sendPrivateRequestConfirmation(to: string, requestData: { title: string; deadline: Date }) {
    await this.mailerService.sendMail({
      to,
      subject: 'Private Request Confirmation',
      template: './private-request-confirmation',
      context: {
        title: requestData.title,
        deadline: requestData.deadline.toDateString(),
      },
    });
  }
}
