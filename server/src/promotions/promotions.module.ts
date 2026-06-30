import { Module } from '@nestjs/common';
import { PromotionsAdminController } from './promotions-admin.controller.js';
import { PromotionsService } from './promotions.service.js';

@Module({
  controllers: [PromotionsAdminController],
  providers: [PromotionsService],
  exports: [PromotionsService],
})
export class PromotionsModule {}
