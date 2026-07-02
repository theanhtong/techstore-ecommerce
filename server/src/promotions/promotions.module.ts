import { CouponsModule } from '../coupons/coupons.module.js';
import { Module } from '@nestjs/common';
import { PromotionsAdminController } from './promotions-admin.controller.js';
import { PromotionsService } from './promotions.service.js';

@Module({
  imports: [CouponsModule],
  controllers: [PromotionsAdminController],
  providers: [PromotionsService],
  exports: [PromotionsService],
})
export class PromotionsModule {}
