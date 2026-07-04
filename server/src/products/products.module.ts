import { InventoryModule } from '../inventories/inventory.module.js';
import { Module } from '@nestjs/common';
import { ProductsAdminController } from './products-admin.controller.js';
import { ProductsController } from './products.controller.js';
import { ProductsService } from './products.service.js';
import { PromotionsModule } from '../promotions/promotions.module.js';
import { UploadModule } from '../upload/upload.module.js';

@Module({
  imports: [InventoryModule, UploadModule, PromotionsModule],
  controllers: [ProductsController, ProductsAdminController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
