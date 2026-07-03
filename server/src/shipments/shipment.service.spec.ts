import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  OrderStatus,
  PaymentMethod,
  ShipmentStatus,
} from '../generated/prisma/enums.js';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

import { SHIPPING_PROVIDER } from './interfaces/shipping-provider.interface.js';

const mockUuidv7 = jest.fn(() => 'shipment-uuid');

jest.unstable_mockModule('uuidv7', () => ({
  __esModule: true,
  uuidv7: mockUuidv7,
}));

jest.unstable_mockModule('../common/helpers/price.hepler.js', () => ({
  toNumber: (val: any) => (val ? Number(val) : 0),
}));

const { ShipmentsService } = await import('./shipments.service.js');
const { OrdersService } = await import('../orders/orders.service.js');
const { PaymentsService } = await import('../payments/payments.service.js');
const { PrismaService } = await import('../prisma/prisma.service.js');
const { GHN_STATUS_MAP } = await import('./helpers/ghn-status.map.js');

describe('ShipmentsService', () => {
  let service: any;

  const mockPrismaService: Record<string, any> = {
    order: {
      findUnique: jest.fn(),
    },
    shipment: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    shipmentTracking: {
      create: jest.fn(),
    },
  };

  const mockOrdersService: Record<string, any> = {
    updateStatus: jest.fn(),
    cancelOrder: jest.fn(),
  };

  const mockPaymentsService: Record<string, any> = {
    markCodPaid: jest.fn(),
  };

  const mockShippingProvider: Record<string, any> = {
    createOrder: jest.fn(),
    getOrderStatus: jest.fn(),
  };

  beforeEach(async () => {
    // Ép trực tiếp các trạng thái test vào map thật để đảm bảo syncStatus luôn đọc được dữ liệu mock
    GHN_STATUS_MAP['storing'] = ShipmentStatus.IN_TRANSIT;
    GHN_STATUS_MAP['delivering'] = ShipmentStatus.OUT_FOR_DELIVERY;
    GHN_STATUS_MAP['delivered'] = ShipmentStatus.DELIVERED;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShipmentsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: OrdersService, useValue: mockOrdersService },
        { provide: PaymentsService, useValue: mockPaymentsService },
        { provide: SHIPPING_PROVIDER, useValue: mockShippingProvider },
      ],
    }).compile();

    service = module.get<any>(ShipmentsService);

    jest.clearAllMocks();
    process.env.SHIPPING_PROVIDER = 'ghn';
  });

  describe('createShipment', () => {
    const mockOrder = {
      id: 'order-1',
      status: OrderStatus.CONFIRMED,
      orderNumber: 'ORD-999',
      total: 500000,
      address: {
        fullName: 'Nguyen Van A',
        phone: '0901234567',
        addressLine: '123 Đường ABC',
        provinceName: 'Hồ Chí Minh',
        districtName: 'Quận 1',
        wardName: 'Phường Bến Nghé',
      },
      items: [{ variantSnapshot: { productName: 'iPhone 15' }, quantity: 1 }],
      payment: { method: PaymentMethod.COD },
      shipment: null as any,
    };

    it('should throw NotFoundException if order does not exist', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(null);

      await expect(service.createShipment('order-1', {})).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if order status is not CONFIRMED', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.PENDING,
      });

      await expect(service.createShipment('order-1', {})).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if shipment already exists', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue({
        ...mockOrder,
        shipment: { id: 'ship-1' },
      });

      await expect(service.createShipment('order-1', {})).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should successfully interface with third-party logistics and create an internal pending shipment record', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);
      mockShippingProvider.createOrder.mockResolvedValue({
        trackingNumber: 'GHN-TRACK-123',
        expectedDeliveryAt: new Date(),
      });
      mockPrismaService.shipment.create.mockResolvedValue({
        id: 'shipment-uuid',
        trackingNumber: 'GHN-TRACK-123',
      });
      mockOrdersService.updateStatus.mockResolvedValue({});

      const result = await service.createShipment('order-1', { weight: 1000 });

      expect(mockShippingProvider.createOrder).toHaveBeenCalled();
      expect(mockPrismaService.shipment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            orderId: 'order-1',
            trackingNumber: 'GHN-TRACK-123',
            status: ShipmentStatus.PENDING,
          }),
        }),
      );
      expect(mockOrdersService.updateStatus).toHaveBeenCalledWith('order-1', {
        status: OrderStatus.SHIPPED,
      });
      expect(result.id).toBe('shipment-uuid');
    });
  });

  describe('addTracking', () => {
    const mockShipment = {
      id: 'ship-1',
      orderId: 'order-1',
      order: { userId: 'user-1' },
    };

    it('should throw NotFoundException if shipment record is missing', async () => {
      mockPrismaService.shipment.findUnique.mockResolvedValue(null);

      await expect(
        service.addTracking('ship-1', {
          status: ShipmentStatus.IN_TRANSIT,
          description: 'In Transit',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should seamlessly execute cascades for order completions and update payment vectors if status matches DELIVERED', async () => {
      mockPrismaService.shipment.findUnique.mockResolvedValue(mockShipment);
      mockPrismaService.shipmentTracking.create.mockResolvedValue({
        id: 'track-node',
      });
      mockPrismaService.shipment.update.mockResolvedValue({});
      mockOrdersService.updateStatus.mockResolvedValue({});
      mockPaymentsService.markCodPaid.mockResolvedValue({});

      const result = await service.addTracking('ship-1', {
        status: ShipmentStatus.DELIVERED,
        description: 'Giao hàng thành công',
      });

      expect(mockPrismaService.shipmentTracking.create).toHaveBeenCalled();
      expect(mockOrdersService.updateStatus).toHaveBeenCalledWith('order-1', {
        status: OrderStatus.DELIVERED,
      });
      expect(mockPaymentsService.markCodPaid).toHaveBeenCalledWith('order-1');
      expect(result.id).toBe('track-node');
    });

    it('should gracefully call order cancellation procedures if shipping fails or is returned', async () => {
      mockPrismaService.shipment.findUnique.mockResolvedValue(mockShipment);
      mockPrismaService.shipmentTracking.create.mockResolvedValue({});
      mockPrismaService.shipment.update.mockResolvedValue({});
      mockOrdersService.cancelOrder.mockResolvedValue({});

      await service.addTracking('ship-1', {
        status: ShipmentStatus.FAILED,
        description: 'Khách không nghe máy',
      });

      expect(mockOrdersService.cancelOrder).toHaveBeenCalledWith(
        'user-1',
        'order-1',
      );
    });
  });

  describe('syncStatus', () => {
    it('should throw NotFoundException if shipment cannot be resolved', async () => {
      mockPrismaService.shipment.findUnique.mockResolvedValue(null);

      await expect(service.syncStatus('ship-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if tracking numbers are empty strings', async () => {
      mockPrismaService.shipment.findUnique.mockResolvedValue({
        id: 'ship-1',
        trackingNumber: null,
      });

      await expect(service.syncStatus('ship-1')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should stop and return early message payload if state mappings reflect no transitions', async () => {
      mockPrismaService.shipment.findUnique.mockResolvedValue({
        id: 'ship-1',
        trackingNumber: 'TRK-1',
        status: ShipmentStatus.IN_TRANSIT,
      });
      mockShippingProvider.getOrderStatus.mockResolvedValue('storing');

      const result = await service.syncStatus('ship-1');

      expect(result).toEqual({
        message: 'No status change',
        current: ShipmentStatus.IN_TRANSIT,
      });
    });

    it('should cleanly push a new tracking state entry down the stack if remote state transitions change', async () => {
      mockPrismaService.shipment.findUnique.mockResolvedValue({
        id: 'ship-1',
        trackingNumber: 'TRK-1',
        status: ShipmentStatus.IN_TRANSIT,
      });
      mockShippingProvider.getOrderStatus.mockResolvedValue('delivered');

      jest
        .spyOn(service, 'addTracking')
        .mockResolvedValue({ id: 'new-node-id' });

      const result = await service.syncStatus('ship-1');

      expect(service.addTracking).toHaveBeenCalledWith('ship-1', {
        status: ShipmentStatus.DELIVERED,
        description: 'delivered',
      });
      expect(result.id).toBe('new-node-id');
    });
  });

  describe('getShipment', () => {
    it('should throw NotFoundException if order does not exist', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(null);

      await expect(service.getShipment('user-1', 'order-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if order does not belong to user scope', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue({
        id: 'order-1',
        userId: 'user-other',
      });

      await expect(service.getShipment('user-1', 'order-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should return shipment with tracking history if everything matches correctly', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue({
        id: 'order-1',
        userId: 'user-1',
      });
      mockPrismaService.shipment.findUnique.mockResolvedValue({
        id: 'ship-1',
        trackingHistory: [],
      });

      const result = await service.getShipment('user-1', 'order-1');
      expect(result.id).toBe('ship-1');
    });
  });

  describe('findByTrackingNumber', () => {
    it('should execute a findFirst filter and return targeted records', async () => {
      const mockShip = { id: 'ship-1', trackingNumber: 'TRK-XYZ' };
      mockPrismaService.shipment.findFirst.mockResolvedValue(mockShip);

      const result = await service.findByTrackingNumber('TRK-XYZ');
      expect(result).toEqual(mockShip);
    });
  });
});
