import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { OrderStatus } from '../generated/prisma/client.js';

const mockUuidv7 = jest.fn(() => 'mocked-uuid-v7');

jest.unstable_mockModule('uuidv7', () => ({
  __esModule: true,
  uuidv7: mockUuidv7,
}));

jest.unstable_mockModule('./helpers/order-number.helper.js', () => ({
  generateOrderNumber: () => 'ORD-123456',
}));

jest.unstable_mockModule('./helpers/order-transition.helper.js', () => ({
  isValidTransition: jest.fn(() => true),
}));

jest.unstable_mockModule('../common/helpers/pagination.helper.js', () => ({
  buildPaginated: jest.fn((data, total, page, limit) => ({
    data,
    total,
    page,
    limit,
  })),
}));

const { OrdersService } = await import('./orders.service.js');
const { PrismaService } = await import('../prisma/prisma.service.js');
const { CouponsService } = await import('../coupons/coupons.service.js');
const { NotificationsService } =
  await import('../notifications/notifications.service.js');
const { SHIPPING_PROVIDER } =
  await import('../shipments/interfaces/shipping-provider.interface.js');
const { isValidTransition } =
  await import('./helpers/order-transition.helper.js');
const { buildPaginated } =
  await import('../common/helpers/pagination.helper.js');

describe('OrdersService', () => {
  let service: any;

  const mockPrismaService: Record<string, any> = {
    address: { findUnique: jest.fn() },
    cartItem: { findMany: jest.fn(), deleteMany: jest.fn() },
    inventory: { findMany: jest.fn(), update: jest.fn() },
    order: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
    coupon: { update: jest.fn() },
    couponUsage: { create: jest.fn(), deleteMany: jest.fn() },
    $executeRaw: jest.fn(),
    $transaction: jest.fn((cbOrArray: any) => {
      if (typeof cbOrArray === 'function') {
        return cbOrArray(mockPrismaService);
      }
      return Promise.all(cbOrArray);
    }),
  };

  const mockCouponsService: Record<string, any> = { applyToOrder: jest.fn() };
  const mockNotificationsService: Record<string, any> = { create: jest.fn() };
  const mockShippingProvider: Record<string, any> = { calculateFee: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: CouponsService, useValue: mockCouponsService },
        { provide: NotificationsService, useValue: mockNotificationsService },
        { provide: SHIPPING_PROVIDER, useValue: mockShippingProvider },
      ],
    }).compile();

    service = module.get<any>(OrdersService);

    jest.clearAllMocks();
    jest.mocked(isValidTransition).mockReturnValue(true);
    process.env.GHN_DEFAULT_ITEM_WEIGHT = '500';
  });

  describe('createOrder', () => {
    const mockDto = {
      addressId: 'addr-123',
      cartItemIds: ['cart-1'],
      notes: 'Deliver fast',
      couponCode: 'SALE10',
    };
    const mockAddress = {
      id: 'addr-123',
      userId: 'user-122',
      districtId: 1,
      wardCode: '1A',
      fullName: 'John Doe',
    };

    it('should throw NotFoundException if address is missing', async () => {
      mockPrismaService.address.findUnique.mockResolvedValue(null);
      await expect(service.createOrder('user-122', mockDto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if address belongs to another user', async () => {
      mockPrismaService.address.findUnique.mockResolvedValue({
        ...mockAddress,
        userId: 'hacker-id',
      });
      await expect(service.createOrder('user-122', mockDto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should create order successfully on valid data flow with coupon', async () => {
      mockPrismaService.address.findUnique.mockResolvedValue(mockAddress);
      mockPrismaService.cartItem.findMany.mockResolvedValue([
        {
          id: 'cart-1',
          variantId: 'var-1',
          quantity: 2,
          variant: {
            sku: 'SKU-OK',
            price: 50,
            salePrice: null,
            product: { name: 'Item', slug: 'item' },
            images: [],
            inventory: { quantity: 10, reservedQuantity: 0 },
          },
        },
      ]);
      mockShippingProvider.calculateFee.mockResolvedValue(15);

      mockCouponsService.applyToOrder.mockResolvedValue({
        coupon: { id: 'coupon-123' },
        discountAmount: 10,
      });

      mockPrismaService.inventory.findMany.mockResolvedValue([
        { variantId: 'var-1', quantity: 10, reservedQuantity: 0 },
      ]);
      mockPrismaService.order.create.mockResolvedValue({
        id: 'mocked-uuid-v7',
        orderNumber: 'ORD-123456',
      });

      const result = await service.createOrder('user-122', mockDto);

      expect(mockCouponsService.applyToOrder).toHaveBeenCalledWith(
        'user-122',
        'SALE10',
        100,
      );
      expect(mockPrismaService.coupon.update).toHaveBeenCalledWith({
        where: { id: 'coupon-123' },
        data: { usedCount: { increment: 1 } },
      });
      expect(mockPrismaService.couponUsage.create).toHaveBeenCalled();
      expect(mockPrismaService.order.create).toHaveBeenCalled();
      expect(mockPrismaService.inventory.update).toHaveBeenCalled();
      expect(mockNotificationsService.create).toHaveBeenCalled();
      expect(result.orderNumber).toBe('ORD-123456');
    });
  });

  describe('getMyOrders', () => {
    it('should return paginated user orders', async () => {
      const mockQuery = { skip: 0, limit: 10, page: 1 };
      mockPrismaService.order.findMany.mockResolvedValue([{ id: 'order-1' }]);
      mockPrismaService.order.count.mockResolvedValue(1);

      await service.getMyOrders('user-1', mockQuery as any);

      expect(mockPrismaService.order.findMany).toHaveBeenCalled();
      expect(buildPaginated).toHaveBeenCalledWith(
        [{ id: 'order-1' }],
        1,
        1,
        10,
      );
    });
  });

  describe('getMyOrder', () => {
    it('should throw NotFoundException if order does not exist', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(null);
      await expect(service.getMyOrder('user-1', 'order-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if order belongs to another user', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue({
        id: 'order-1',
        userId: 'user-2',
      });
      await expect(service.getMyOrder('user-1', 'order-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should return the order details if valid', async () => {
      const mockOrder = { id: 'order-1', userId: 'user-1' };
      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);

      const result = await service.getMyOrder('user-1', 'order-1');
      expect(result).toEqual(mockOrder);
    });
  });

  describe('cancelOrder', () => {
    const mockOrder = {
      id: 'order-1',
      userId: 'user-1',
      orderNumber: 'ORD-123456',
      status: OrderStatus.PENDING,
      couponId: 'coupon-123',
      items: [{ variantId: 'var-1', quantity: 2 }],
    };

    it('should throw BadRequestException if state transition is invalid', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);

      jest.mocked(isValidTransition).mockReturnValue(false);

      await expect(service.cancelOrder('user-1', 'order-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should release inventory and rollback coupon upon cancellation', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);

      jest.mocked(isValidTransition).mockReturnValue(true);

      await service.cancelOrder('user-1', 'order-1');

      expect(mockPrismaService.inventory.update).toHaveBeenCalledWith({
        where: { variantId: 'var-1' },
        data: { reservedQuantity: { decrement: 2 } },
      });
      expect(mockPrismaService.coupon.update).toHaveBeenCalledWith({
        where: { id: 'coupon-123' },
        data: { usedCount: { decrement: 1 } },
      });
      expect(mockPrismaService.couponUsage.deleteMany).toHaveBeenCalledWith({
        where: { orderId: 'order-1' },
      });
      expect(mockPrismaService.order.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: { status: OrderStatus.CANCELLED } }),
      );
      expect(mockNotificationsService.create).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('should query orders using search and return paginated data', async () => {
      const mockQuery = { skip: 0, limit: 5, page: 1, search: 'ORD' };
      mockPrismaService.order.findMany.mockResolvedValue([]);
      mockPrismaService.order.count.mockResolvedValue(0);

      await service.findAll(mockQuery as any);

      expect(mockPrismaService.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { orderNumber: { contains: 'ORD', mode: 'insensitive' } },
        }),
      );
    });
  });

  describe('updateStatus', () => {
    const mockOrder = {
      id: 'order-1',
      status: OrderStatus.SHIPPED,
      couponId: 'coupon-123',
      items: [{ variantId: 'var-1', quantity: 3 }],
    };

    it('should permanently deduct stock when status switches to DELIVERED', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);

      await service.updateStatus('order-1', { status: OrderStatus.DELIVERED });

      expect(mockPrismaService.inventory.update).toHaveBeenCalledWith({
        where: { variantId: 'var-1' },
        data: {
          quantity: { decrement: 3 },
          reservedQuantity: { decrement: 3 },
        },
      });
    });

    it('should trigger rollback logic when admin changes status to CANCELLED', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);

      await service.updateStatus('order-1', { status: OrderStatus.CANCELLED });

      expect(mockPrismaService.inventory.update).toHaveBeenCalledWith({
        where: { variantId: 'var-1' },
        data: { reservedQuantity: { decrement: 3 } },
      });
      expect(mockPrismaService.coupon.update).toHaveBeenCalledWith({
        where: { id: 'coupon-123' },
        data: { usedCount: { decrement: 1 } },
      });
    });
  });
});
