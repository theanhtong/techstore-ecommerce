import { CampaignsModule } from '../campaigns/campaigns.module.js';
import { CouponsAdminController } from './coupons-admin.controller.js';
import { CouponsController } from './coupons.controller.js';
import { CouponsService } from './coupons.service.js';
import { Module } from '@nestjs/common';

@Module({
  imports: [CampaignsModule],
  controllers: [CouponsController, CouponsAdminController],
  providers: [CouponsService],
  exports: [CouponsService],
})
export class CouponsModule {}
