import { Inject, Injectable } from '@nestjs/common';

import {
  type IMailProvider,
  MAIL_PROVIDER,
} from './interfaces/mail-provider.interface.js';
import { verifyEmailTemplate } from './templates/verify-email.template.js';
import { phoneOtpTemplate } from './templates/phone-otp.template.js';

@Injectable()
export class MailService {
  constructor(
    @Inject(MAIL_PROVIDER) private readonly provider: IMailProvider,
  ) { }

  async sendVerificationEmail(
    to: string,
    name: string,
    token: string,
  ): Promise<void> {
    const verifyUrl = `${process.env.APP_URL}/auth/verify-email?token=${token}`;

    await this.provider.send({
      to,
      subject: 'Verify your email',
      html: verifyEmailTemplate(name, verifyUrl),
    });
  }

  async sendOtpEmail(
    to: string,
    phone: string,
    code: string,
  ): Promise<void> {
    await this.provider.send({
      to,
      subject: `[TechStore] Phone verification OTP for ${phone}`,
      html: phoneOtpTemplate(phone, code),
    });
  }
}
