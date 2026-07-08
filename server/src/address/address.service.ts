import { Inject, Injectable, BadRequestException } from '@nestjs/common';
import {
  type IAddressProvider,
  ADDRESS_PROVIDER,
} from './interfaces/address-provider.interface.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { MailService } from '../mail/mail.service.js';
import { uuidv7 } from 'uuidv7';

@Injectable()
export class AddressService {
  constructor(
    @Inject(ADDRESS_PROVIDER) private readonly provider: IAddressProvider,
    private readonly prisma: PrismaService,
    private readonly mailService: MailService,
  ) { }

  getProvinces() {
    return this.provider.getProvinces();
  }

  getDistricts(provinceId: number) {
    return this.provider.getDistricts(provinceId);
  }

  getWards(districtId: number) {
    return this.provider.getWards(districtId);
  }

  async sendOtp(phone: string, email: string): Promise<void> {
    const existing = await this.prisma.phoneVerification.findUnique({
      where: { phone },
    });

    if (existing) {
      const timeSinceLastSend = Date.now() - existing.updatedAt.getTime();
      const cooldownMs = 60 * 1000; // 60 seconds
      if (timeSinceLastSend < cooldownMs) {
        const secondsLeft = Math.ceil((cooldownMs - timeSinceLastSend) / 1000);
        throw new BadRequestException(
          `Please wait ${secondsLeft} seconds before requesting a new OTP code.`,
        );
      }
    }

    // Generate a random 6-digit OTP code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes expiration

    await this.prisma.phoneVerification.upsert({
      where: { phone },
      create: {
        id: uuidv7(),
        phone,
        code,
        verified: false,
        expiresAt,
      },
      update: {
        code,
        verified: false,
        expiresAt,
      },
    });

    const otpProvider = process.env.OTP_PROVIDER || 'mock';
    if (otpProvider === 'email') {
      await this.mailService.sendOtpEmail(email, phone, code);
    } else {
      console.log(`[SMS MOCK] Sent OTP to ${phone}: Your OTP is ${code}`);
    }
  }

  async verifyOtp(phone: string, code: string): Promise<void> {
    const record = await this.prisma.phoneVerification.findUnique({
      where: { phone },
    });

    if (!record || record.expiresAt < new Date()) {
      throw new BadRequestException('OTP has expired or does not exist. Please request a new code.');
    }

    if (record.code !== code) {
      throw new BadRequestException('Incorrect OTP code. Please try again.');
    }

    // Set verified as true, extend expiration to 15 minutes to save address
    await this.prisma.phoneVerification.update({
      where: { phone },
      data: {
        verified: true,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      },
    });
  }
}
