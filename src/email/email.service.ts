import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailDispatcherDto } from './dto/send-mail.dto';
import { Logger } from '@nestjs/common';
const sgMail = require('@sendgrid/mail');

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  constructor(private readonly configService: ConfigService) {}

  async emailDispatcher(mailDispatcher: MailDispatcherDto) {
    sgMail.setApiKey(this.configService.get('SENDGRID_API_KEY'));

    const msg = {
      to: mailDispatcher.to,
      from: mailDispatcher.from,
      subject: mailDispatcher.subject ?? 'Testing Email',
      text: mailDispatcher.text,
      html: mailDispatcher.html,
    };

    sgMail
      .send(msg)
      .then((response: any) => {
        this.logger.log('Email sent successfully');
      })
      .catch((error) => {
        this.logger.error('Error sending email:', error);
      });
  }
}
