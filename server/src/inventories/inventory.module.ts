import { InventoryService } from './inventories.service.js';
import { Module } from '@nestjs/common';

@Module({
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
