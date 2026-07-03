import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockUuidv7 = jest.fn(() => 'coupon-id');

jest.unstable_mockModule('uuidv7', () => ({
  __esModule: true,
  uuidv7: mockUuidv7,
}));

jest.unstable_mockModule('../common/helpers/pagination.helper.js', () => ({
  buildPaginated: jest.fn((data, total, page, limit) => ({
    data,
    total,
    page,
    limit,
  })),
}));

jest.unstable_mockModule('../common/helpers/price.hepler.js', () => ({
  toNumber: (val: any) => (val ? Number(val) : 0),
}));

const { CouponsService } = await import('./coupons.service.js');
const { PrismaService } = await import('../prisma/prisma.service.js');
const { buildPaginated } =
  await import('../common/helpers/pagination.helper.js');

describe('CouponsService', () => {
  let service: any;

  const mockPrismaService: Record<string, any> = {
    coupon: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    promotion: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn((arr: any) => Promise.all(arr)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CouponsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<any>(CouponsService);

    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should throw ConflictException if coupon code already exists', async () => {
      mockPrismaService.coupon.findUnique.mockResolvedValue({
        id: '1',
      });

      await expect(service.create({ code: 'SALE10' })).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw NotFoundException if promotion does not exist', async () => {
      mockPrismaService.coupon.findUnique.mockResolvedValue(null);
      mockPrismaService.promotion.findUnique.mockResolvedValue(null);

      await expect(
        service.create({ code: 'SALE10', promotionId: 'promo-1' }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should create coupon successfully', async () => {
      mockPrismaService.coupon.findUnique.mockResolvedValue(null);
      mockPrismaService.coupon.create.mockResolvedValue({
        id: 'coupon-id',
        code: 'SALE10',
      });

      const result = await service.create({ code: 'SALE10' });

      expect(mockPrismaService.coupon.create).toHaveBeenCalled();
      expect(result.id).toBe('coupon-id');
    });
  });

  describe('findAll', () => {
    it('should query coupons using search and return paginated data', async () => {
      const mockQuery = { skip: 0, limit: 5, page: 1, search: 'SALE' };
      const mockCoupons = [{ id: 'coupon-1', code: 'SALE10' }];

      mockPrismaService.coupon.findMany.mockResolvedValue(mockCoupons);
      mockPrismaService.coupon.count.mockResolvedValue(1);

      const result = await service.findAll(mockQuery);

      expect(mockPrismaService.coupon.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { code: { contains: 'SALE', mode: 'insensitive' } },
          skip: 0,
          take: 5,
        }),
      );
      expect(buildPaginated).toHaveBeenCalledWith(mockCoupons, 1, 1, 5);
      expect(result.data).toEqual(mockCoupons);
    });

    it('should query coupons without search when query.search is empty', async () => {
      const mockQuery = { skip: 0, limit: 10, page: 1, search: undefined };

      mockPrismaService.coupon.findMany.mockResolvedValue([]);
      mockPrismaService.coupon.count.mockResolvedValue(0);

      await service.findAll(mockQuery);

      expect(mockPrismaService.coupon.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: {} }),
      );
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException if coupon not found', async () => {
      mockPrismaService.coupon.findUnique.mockResolvedValue(null);

      await expect(service.findOne('coupon-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should return coupon if found', async () => {
      const mockCoupon = { id: 'coupon-1', code: 'SALE10', usages: [] };
      mockPrismaService.coupon.findUnique.mockResolvedValue(mockCoupon);

      const result = await service.findOne('coupon-1');
      expect(result).toEqual(mockCoupon);
    });
  });

  describe('update', () => {
    it('should throw ConflictException if code belongs to another coupon', async () => {
      mockPrismaService.coupon.findUnique
        .mockResolvedValueOnce({ id: 'coupon-1' })
        .mockResolvedValueOnce({ id: 'coupon-2', code: 'SALE20' });

      await expect(
        service.update('coupon-1', { code: 'SALE20' }),
      ).rejects.toThrow(ConflictException);
    });

    it('should update coupon successfully', async () => {
      mockPrismaService.coupon.findUnique.mockResolvedValue({
        id: 'coupon-1',
      });
      mockPrismaService.coupon.update.mockResolvedValue({
        id: 'coupon-1',
        code: 'NEWCODE',
      });

      const result = await service.update('coupon-1', { code: 'NEWCODE' });
      expect(mockPrismaService.coupon.update).toHaveBeenCalled();
      expect(result.code).toBe('NEWCODE');
    });
  });

  describe('remove', () => {
    it('should soft delete coupon by setting isActive to false', async () => {
      mockPrismaService.coupon.findUnique.mockResolvedValue({
        id: 'coupon-1',
      });
      mockPrismaService.coupon.update.mockResolvedValue({
        id: 'coupon-1',
        isActive: false,
      });

      await service.remove('coupon-1');

      expect(mockPrismaService.coupon.update).toHaveBeenCalledWith({
        where: { id: 'coupon-1' },
        data: { isActive: false },
      });
    });
  });

  describe('validate', () => {
    it('should return invalid if coupon not found', async () => {
      mockPrismaService.coupon.findUnique.mockResolvedValue(null);

      const result = await service.validate('user-1', {
        code: 'SALE10',
        orderSubtotal: 100,
      });
      expect(result.isValid).toBe(false);
      expect(result.message).toBe('Coupon not found');
    });

    it('should return invalid if coupon is inactive', async () => {
      mockPrismaService.coupon.findUnique.mockResolvedValue({
        isActive: false,
      });

      const result = await service.validate('user-1', {
        code: 'SALE10',
        orderSubtotal: 100,
      });
      expect(result.isValid).toBe(false);
      expect(result.message).toBe('Coupon is inactive');
    });

    it('should return invalid if coupon expired', async () => {
      mockPrismaService.coupon.findUnique.mockResolvedValue({
        isActive: true,
        expiresAt: new Date(Date.now() - 5000),
      });

      const result = await service.validate('user-1', {
        code: 'SALE10',
        orderSubtotal: 100,
      });
      expect(result.isValid).toBe(false);
      expect(result.message).toBe('Coupon has expired');
    });

    it('should return invalid if usage limit reached', async () => {
      mockPrismaService.coupon.findUnique.mockResolvedValue({
        isActive: true,
        expiresAt: null,
        usageLimit: 10,
        usedCount: 10,
      });

      const result = await service.validate('user-1', {
        code: 'SALE10',
        orderSubtotal: 100,
      });
      expect(result.isValid).toBe(false);
      expect(result.message).toBe('Coupon usage limit reached');
    });

    it('should return invalid if per user limit reached', async () => {
      mockPrismaService.coupon.findUnique.mockResolvedValue({
        isActive: true,
        expiresAt: null,
        usageLimit: null,
        perUserLimit: 1,
        usages: [{ id: 'usage-1' }],
      });

      const result = await service.validate('user-1', {
        code: 'SALE10',
        orderSubtotal: 100,
      });
      expect(result.isValid).toBe(false);
      expect(result.message).toBe(
        'You have reached the usage limit for this coupon',
      );
    });

    it('should return invalid if order subtotal is below minOrderValue', async () => {
      mockPrismaService.coupon.findUnique.mockResolvedValue({
        isActive: true,
        expiresAt: null,
        usageLimit: null,
        perUserLimit: null,
        usages: [],
        minOrderValue: 200,
      });

      const result = await service.validate('user-1', {
        code: 'SALE10',
        orderSubtotal: 100,
      });
      expect(result.isValid).toBe(false);
      expect(result.message).toContain('Minimum order value is');
    });

    it('should validate percentage coupon and respect maxDiscount', async () => {
      mockPrismaService.coupon.findUnique.mockResolvedValue({
        isActive: true,
        expiresAt: null,
        usageLimit: null,
        perUserLimit: null,
        usages: [],
        minOrderValue: null,
        discountType: 'PERCENTAGE',
        discountValue: 10,
        maxDiscount: 150,
      });

      const result = await service.validate('user-1', {
        code: 'SALE10',
        orderSubtotal: 2000,
      });
      expect(result.isValid).toBe(true);
      expect(result.discountAmount).toBe(150);
      expect(result.finalAmount).toBe(1850);
    });
  });

  describe('applyToOrder', () => {
    it('should throw BadRequestException if coupon validation fails (e.g. not found)', async () => {
      mockPrismaService.coupon.findUnique.mockResolvedValue(null);

      await expect(
        service.applyToOrder('user-1', 'SALE10', 1000),
      ).rejects.toThrow(BadRequestException);
    });

    it('should return coupon and exact discount amount on successful validation', async () => {
      const mockCoupon = {
        id: 'coupon-1',
        isActive: true,
        expiresAt: null,
        usageLimit: null,
        perUserLimit: null,
        usages: [],
        minOrderValue: null,
        discountType: 'FIXED',
        discountValue: 50,
        maxDiscount: null,
      };
      mockPrismaService.coupon.findUnique.mockResolvedValue(mockCoupon);

      const result = await service.applyToOrder('user-1', 'SALE50', 500);
      expect(result.discountAmount).toBe(50);
      expect(result.coupon.id).toBe('coupon-1');
    });
  });
});
