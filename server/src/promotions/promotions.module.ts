import { CampaignsModule } from '../campaigns/campaigns.module.js';
import { Module } from '@nestjs/common';
import { PromotionsAdminController } from './promotions-admin.controller.js';
import { PromotionsService } from './promotions.service.js';

@Module({
  imports: [CampaignsModule],
  controllers: [PromotionsAdminController],
  providers: [PromotionsService],
  exports: [PromotionsService],
})
export class PromotionsModule {}
