import { CartController } from './cart.controller.js';
import { CartService } from './cart.service.js';
import { Module } from '@nestjs/common';

@Module({
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}
