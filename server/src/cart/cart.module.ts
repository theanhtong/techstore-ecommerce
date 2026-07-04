import { CartController } from './cart.controller.js';
import { CartService } from './cart.service.js';
import { Module } from '@nestjs/common';
import { PromotionsModule } from '../promotions/promotions.module.js';

@Module({
  imports: [PromotionsModule],
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}
