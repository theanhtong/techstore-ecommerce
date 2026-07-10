import { Module } from '@nestjs/common';
import { CleanupService } from './cleanup.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  providers: [CleanupService],
  exports: [CleanupService],
})
export class CleanupModule {}
