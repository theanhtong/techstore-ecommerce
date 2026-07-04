import { CampaignsController } from './campaigns-admin.controller.js';
import { CampaignsService } from './campaigns.service.js';
import { Module } from '@nestjs/common';

@Module({
  controllers: [CampaignsController],
  providers: [CampaignsService],
  exports: [CampaignsService],
})
export class CampaignsModule {}
