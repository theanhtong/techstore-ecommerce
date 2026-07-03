import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { NotFoundException } from '@nestjs/common';

const mockUuidv7 = jest.fn(() => 'inventory-id');

jest.unstable_mockModule('uuidv7', () => ({
  __esModule: true,
  uuidv7: mockUuidv7,
}));

const { InventoryService } = await import('./inventories.service.js');
const { PrismaService } = await import('../prisma/prisma.service.js');

describe('InventoryService', () => {
  let service: any;
  let prisma: any;

  const mockPrismaService = {
    inventory: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<any>(InventoryService);
    prisma = module.get<any>(PrismaService);

    jest.clearAllMocks();
  });

  describe('findByVariant', () => {
    it('should throw NotFoundException if inventory not found', async () => {
      prisma.inventory.findUnique.mockResolvedValue(null);

      await expect(service.findByVariant('variant-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return inventory if found', async () => {
      const inventory = {
        variantId: 'variant-1',
        quantity: 20,
        reservedQuantity: 5,
      };

      prisma.inventory.findUnique.mockResolvedValue(inventory);

      const result = await service.findByVariant('variant-1');
      expect(result).toEqual(inventory);
    });
  });

  describe('update', () => {
    it('should upsert inventory', async () => {
      prisma.inventory.upsert.mockResolvedValue({
        variantId: 'variant-1',
        quantity: 100,
      });

      await service.update('variant-1', { quantity: 100 });

      expect(prisma.inventory.upsert).toHaveBeenCalledWith({
        where: { variantId: 'variant-1' },
        update: { quantity: 100 },
        create: {
          id: 'inventory-id',
          variantId: 'variant-1',
          quantity: 100,
          reservedQuantity: 0,
        },
      });
    });
  });

  describe('reserve', () => {
    it('should throw Error when stock is insufficient', async () => {
      prisma.inventory.findUnique.mockResolvedValue({
        quantity: 10,
        reservedQuantity: 8,
      });

      await expect(service.reserve('variant-1', 5)).rejects.toThrow(
        'Insufficient stock',
      );
    });

    it('should reserve inventory successfully', async () => {
      prisma.inventory.findUnique.mockResolvedValue({
        quantity: 20,
        reservedQuantity: 5,
      });

      await service.reserve('variant-1', 3);

      expect(prisma.inventory.update).toHaveBeenCalledWith({
        where: { variantId: 'variant-1' },
        data: {
          reservedQuantity: { increment: 3 },
        },
      });
    });
  });

  describe('release', () => {
    it('should release reserved inventory', async () => {
      await service.release('variant-1', 4);

      expect(prisma.inventory.update).toHaveBeenCalledWith({
        where: { variantId: 'variant-1' },
        data: {
          reservedQuantity: { decrement: 4 },
        },
      });
    });
  });

  describe('deduct', () => {
    it('should deduct inventory and reserved quantity', async () => {
      await service.deduct('variant-1', 2);

      expect(prisma.inventory.update).toHaveBeenCalledWith({
        where: { variantId: 'variant-1' },
        data: {
          quantity: { decrement: 2 },
          reservedQuantity: { decrement: 2 },
        },
      });
    });
  });
});
