import { Injectable, NotFoundException } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';
import { UpdateInventoryDto } from './dto/update-inventory.dto.js';
import { uuidv7 } from 'uuidv7';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  async findByVariant(variantId: string) {
    const inventory = await this.prisma.inventory.findUnique({
      where: { variantId },
    });
    if (!inventory)
      throw new NotFoundException(
        `Inventory for variant #${variantId} not found`,
      );
    return inventory;
  }

  async update(variantId: string, dto: UpdateInventoryDto) {
    return this.prisma.inventory.upsert({
      where: { variantId },
      update: { quantity: dto.quantity },
      create: {
        id: uuidv7(),
        variantId,
        quantity: dto.quantity,
        reservedQuantity: 0,
      },
    });
  }

  async reserve(variantId: string, quantity: number) {
    const inventory = await this.findByVariant(variantId);
    const available = inventory.quantity - inventory.reservedQuantity;

    if (available < quantity) {
      throw new Error(`Insufficient stock for variant #${variantId}`);
    }

    return this.prisma.inventory.update({
      where: { variantId },
      data: { reservedQuantity: { increment: quantity } },
    });
  }

  async release(variantId: string, quantity: number) {
    return this.prisma.inventory.update({
      where: { variantId },
      data: { reservedQuantity: { decrement: quantity } },
    });
  }

  async deduct(variantId: string, quantity: number) {
    return this.prisma.inventory.update({
      where: { variantId },
      data: {
        quantity: { decrement: quantity },
        reservedQuantity: { decrement: quantity },
      },
    });
  }
}
