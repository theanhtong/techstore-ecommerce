import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class CleanupService {
  private readonly logger = new Logger(CleanupService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Run every day at midnight to clean up transient data
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleDataCleanup() {
    this.logger.log('Starting scheduled cleanup job...');
    const now = new Date();

    try {
      // 1. Clean expired sessions
      const sessionsResult = await this.prisma.session.deleteMany({
        where: {
          expiresAt: { lt: now },
        },
      });
      if (sessionsResult.count > 0) {
        this.logger.log(`Cleaned up ${sessionsResult.count} expired sessions.`);
      }

      // 2. Clean expired email verifications
      const verificationResult = await this.prisma.emailVerification.deleteMany({
        where: {
          expiresAt: { lt: now },
        },
      });
      if (verificationResult.count > 0) {
        this.logger.log(`Cleaned up ${verificationResult.count} expired email verifications.`);
      }

      // 3. Clean old notifications (> 90 days)
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      const notificationsResult = await this.prisma.notification.deleteMany({
        where: {
          createdAt: { lt: ninetyDaysAgo },
        },
      });
      if (notificationsResult.count > 0) {
        this.logger.log(`Cleaned up ${notificationsResult.count} old notifications.`);
      }

      this.logger.log('Scheduled cleanup job completed successfully.');
    } catch (error) {
      this.logger.error('Failed to run scheduled cleanup job:', error);
    }
  }
}
