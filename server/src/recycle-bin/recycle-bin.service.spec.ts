import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { BadRequestException } from '@nestjs/common';
import { ProductStatus } from '../generated/prisma/enums.js';

const { RecycleBinService } = await import('./recycle-bin.service.js');
const { PrismaService } = await import('../prisma/prisma.service.js');

describe('RecycleBinService', () => {
  let service: any;

  const mockPrismaService: Record<string, any> = {
    product: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    coupon: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    brand: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    category: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    campaign: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecycleBinService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<any>(RecycleBinService);
    jest.clearAllMocks();
  });

  describe('getItems', () => {
    it('should query all soft-deleted items and return mapped items', async () => {
      const now = new Date();
      const mockProduct = { id: 'p1', name: 'Product 1', status: ProductStatus.ARCHIVED, updatedAt: now };
      const mockCoupon = { id: 'co1', code: 'COUPON1', isActive: false, updatedAt: now };
      const mockBrand = { id: 'b1', name: 'Brand 1', isActive: false, updatedAt: now };
      const mockCategory = { id: 'ca1', name: 'Category 1', isActive: false, updatedAt: now };
      const mockCampaign = { id: 'cam1', name: 'Campaign 1', isActive: false, updatedAt: now };

      mockPrismaService.product.findMany.mockResolvedValue([mockProduct]);
      mockPrismaService.coupon.findMany.mockResolvedValue([mockCoupon]);
      mockPrismaService.brand.findMany.mockResolvedValue([mockBrand]);
      mockPrismaService.category.findMany.mockResolvedValue([mockCategory]);
      mockPrismaService.campaign.findMany.mockResolvedValue([mockCampaign]);

      const result = await service.getItems();

      expect(mockPrismaService.product.findMany).toHaveBeenCalled();
      expect(mockPrismaService.coupon.findMany).toHaveBeenCalled();
      expect(mockPrismaService.brand.findMany).toHaveBeenCalled();
      expect(mockPrismaService.category.findMany).toHaveBeenCalled();
      expect(mockPrismaService.campaign.findMany).toHaveBeenCalled();

      expect(result).toHaveLength(5);
      expect(result[0]).toEqual(expect.objectContaining({ id: 'p1', type: 'product', name: 'Product 1' }));
      expect(result[1]).toEqual(expect.objectContaining({ id: 'co1', type: 'coupon', name: 'COUPON1' }));
    });
  });

  describe('restoreItem', () => {
    it('should restore product by setting status to DRAFT', async () => {
      mockPrismaService.product.update.mockResolvedValue({ id: 'p1', status: ProductStatus.DRAFT });
      const result = await service.restoreItem('product', 'p1');
      expect(mockPrismaService.product.update).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: { status: ProductStatus.DRAFT },
      });
      expect(result.status).toBe(ProductStatus.DRAFT);
    });

    it('should restore coupon by setting isActive to true', async () => {
      mockPrismaService.coupon.update.mockResolvedValue({ id: 'co1', isActive: true });
      await service.restoreItem('coupon', 'co1');
      expect(mockPrismaService.coupon.update).toHaveBeenCalledWith({
        where: { id: 'co1' },
        data: { isActive: true },
      });
    });

    it('should throw BadRequestException if invalid type is passed', async () => {
      await expect(service.restoreItem('invalid_type', 'id')).rejects.toThrow(BadRequestException);
    });
  });

  describe('deletePermanently', () => {
    it('should throw NotFoundException if item does not exist or not archived', async () => {
      mockPrismaService.product.findUnique.mockResolvedValue(null);
      await expect(service.deletePermanently('product', 'p1')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if item is soft-deleted for less than 30 days', async () => {
      const now = new Date();
      // soft-deleted 1 day ago
      const recentDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      mockPrismaService.product.findUnique.mockResolvedValue({
        id: 'p1',
        status: ProductStatus.ARCHIVED,
        updatedAt: recentDate,
      });

      await expect(service.deletePermanently('product', 'p1')).rejects.toThrow(BadRequestException);
    });

    it('should delete product permanently if soft-deleted for more than 30 days', async () => {
      const now = new Date();
      // soft-deleted 31 days ago
      const oldDate = new Date(now.getTime() - 31 * 24 * 60 * 60 * 1000);
      mockPrismaService.product.findUnique.mockResolvedValue({
        id: 'p1',
        status: ProductStatus.ARCHIVED,
        updatedAt: oldDate,
      });
      mockPrismaService.product.delete.mockResolvedValue({ id: 'p1' });

      const result = await service.deletePermanently('product', 'p1');

      expect(mockPrismaService.product.delete).toHaveBeenCalledWith({ where: { id: 'p1' } });
      expect(result.id).toBe('p1');
    });
  });
});
