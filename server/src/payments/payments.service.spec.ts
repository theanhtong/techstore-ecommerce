import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import {
  COD_PROVIDER,
  VNPAY_PROVIDER,
} from './interfaces/payment-provider.interface.js';
import { PaymentMethod, PaymentStatus } from '../generated/prisma/enums.js';
import { Test, TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const mockUuidv7 = jest.fn(() => 'payment-id');

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

const { PaymentsService } = await import('./payments.service.js');
const { OrdersService } = await import('../orders/orders.service.js');
const { PrismaService } = await import('../prisma/prisma.service.js');
const { buildPaginated } =
  await import('../common/helpers/pagination.helper.js');

describe('PaymentsService', () => {
  let service: any;

  // Định nghĩa mock object dạng Record<string, any> để tránh lỗi type 'never' một cách triệt để
  const mockPrismaService: Record<string, any> = {
    payment: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    order: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn((arr: any) => Promise.all(arr)),
  };

  const mockOrdersService: Record<string, any> = {};

  const mockCodProvider: Record<string, any> = {
    createPayment: jest.fn(),
    verifyCallback: jest.fn(),
  };

  const mockVnpayProvider: Record<string, any> = {
    createPayment: jest.fn(),
    verifyCallback: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: OrdersService, useValue: mockOrdersService },
        { provide: COD_PROVIDER, useValue: mockCodProvider },
        { provide: VNPAY_PROVIDER, useValue: mockVnpayProvider },
      ],
    }).compile();

    service = module.get<any>(PaymentsService);

    jest.clearAllMocks();
    process.env.APP_URL = 'http://localhost:3000';
  });

  describe('createPayment', () => {
    const mockOrder = {
      id: 'order-1',
      userId: 'user-1',
      orderNumber: 'ORD123',
      total: 1000,
      payment: null as any,
    };

    const createDto = {
      method: PaymentMethod.VNPAY,
      returnUrl: 'http://test.com',
    };

    it('should throw NotFoundException if order does not exist', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(null);

      await expect(
        service.createPayment('user-1', 'order-1', createDto, '127.0.0.1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if order belongs to another user', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue({
        ...mockOrder,
        userId: 'user-2',
      });

      await expect(
        service.createPayment('user-1', 'order-1', createDto, '127.0.0.1'),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if order is already paid', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue({
        ...mockOrder,
        payment: { id: 'pm-1', status: PaymentStatus.PAID },
      });

      await expect(
        service.createPayment('user-1', 'order-1', createDto, '127.0.0.1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should delete old payment if its status is FAILED (retry case)', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue({
        ...mockOrder,
        payment: { id: 'pm-old', status: PaymentStatus.FAILED },
      });
      mockVnpayProvider.createPayment.mockResolvedValue({
        transactionId: 'tx-123',
        paymentUrl: 'http://vnpay.vn',
      });
      mockPrismaService.payment.create.mockResolvedValue({ id: 'payment-id' });

      await service.createPayment('user-1', 'order-1', createDto, '127.0.0.1');

      expect(mockPrismaService.payment.delete).toHaveBeenCalledWith({
        where: { id: 'pm-old' },
      });
    });

    it('should successfully create a pending payment and return details', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);
      mockVnpayProvider.createPayment.mockResolvedValue({
        transactionId: 'tx-123',
        paymentUrl: 'http://vnpay.vn',
      });
      mockPrismaService.payment.create.mockResolvedValue({ id: 'payment-id' });

      const result = await service.createPayment(
        'user-1',
        'order-1',
        createDto,
        '127.0.0.1',
      );

      expect(mockVnpayProvider.createPayment).toHaveBeenCalled();
      expect(mockPrismaService.payment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            id: 'payment-id',
            orderId: 'order-1',
            method: PaymentMethod.VNPAY,
            status: PaymentStatus.PENDING,
            amount: 1000,
            transactionId: 'tx-123',
          },
        }),
      );
      expect(result.paymentUrl).toBe('http://vnpay.vn');
    });
  });

  describe('handleVnpayIpn', () => {
    const mockQuery = { vnp_TxnRef: 'order-1' };

    it('should return RspCode 01 if payment is not found', async () => {
      mockVnpayProvider.verifyCallback.mockResolvedValue({
        orderId: 'order-1',
        isSuccess: true,
      });
      mockPrismaService.payment.findFirst.mockResolvedValue(null);

      const result = await service.handleVnpayIpn(mockQuery);
      expect(result).toEqual({ RspCode: '01', Message: 'Payment not found' });
    });

    it('should return RspCode 02 if payment is already processed', async () => {
      mockVnpayProvider.verifyCallback.mockResolvedValue({
        orderId: 'order-1',
        isSuccess: true,
      });
      mockPrismaService.payment.findFirst.mockResolvedValue({
        id: 'pm-1',
        status: PaymentStatus.PAID,
      });

      const result = await service.handleVnpayIpn(mockQuery);
      expect(result).toEqual({
        RspCode: '02',
        Message: 'Payment already processed',
      });
    });

    it('should update payment/order status to PAID on success callback', async () => {
      mockVnpayProvider.verifyCallback.mockResolvedValue({
        orderId: 'order-1',
        isSuccess: true,
        transactionId: 'tx-999',
      });
      mockPrismaService.payment.findFirst.mockResolvedValue({
        id: 'pm-1',
        orderId: 'order-1',
        status: PaymentStatus.PENDING,
      });
      mockPrismaService.payment.update.mockResolvedValue({});
      mockPrismaService.order.update.mockResolvedValue({});

      const result = await service.handleVnpayIpn(mockQuery);

      expect(mockPrismaService.payment.update).toHaveBeenCalled();
      expect(mockPrismaService.order.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { paymentStatus: PaymentStatus.PAID },
        }),
      );
      expect(result).toEqual({ RspCode: '00', Message: 'Success' });
    });

    it('should update status to FAILED on failed callback', async () => {
      mockVnpayProvider.verifyCallback.mockResolvedValue({
        orderId: 'order-1',
        isSuccess: false,
      });
      mockPrismaService.payment.findFirst.mockResolvedValue({
        id: 'pm-1',
        orderId: 'order-1',
        status: PaymentStatus.PENDING,
      });
      mockPrismaService.payment.update.mockResolvedValue({});

      const result = await service.handleVnpayIpn(mockQuery);

      expect(mockPrismaService.payment.update).toHaveBeenCalledWith({
        where: { id: 'pm-1' },
        data: { status: PaymentStatus.FAILED },
      });
      expect(result).toEqual({ RspCode: '00', Message: 'Confirmed failure' });
    });
  });

  describe('handleVnpayReturn', () => {
    it('should parse callback query parameters and return structural state without DB changes', async () => {
      mockVnpayProvider.verifyCallback.mockResolvedValue({
        orderId: 'order-1',
        isSuccess: true,
      });

      const result = await service.handleVnpayReturn({ someUrlParam: 'val' });
      expect(result).toEqual({
        isSuccess: true,
        orderId: 'order-1',
        message: 'Payment successful',
      });
    });
  });

  describe('markCodPaid', () => {
    it('should return immediately if payment does not exist or is not COD', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValue(null);
      await service.markCodPaid('order-1');
      expect(mockPrismaService.$transaction).not.toHaveBeenCalled();

      mockPrismaService.payment.findUnique.mockResolvedValue({
        method: PaymentMethod.VNPAY,
      });
      await service.markCodPaid('order-1');
      expect(mockPrismaService.$transaction).not.toHaveBeenCalled();
    });

    it('should update payment status to PAID if valid pending COD order', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValue({
        orderId: 'order-1',
        method: PaymentMethod.COD,
        status: PaymentStatus.PENDING,
      });
      mockPrismaService.payment.update.mockResolvedValue({});
      mockPrismaService.order.update.mockResolvedValue({});

      await service.markCodPaid('order-1');

      expect(mockPrismaService.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: PaymentStatus.PAID }),
        }),
      );
    });
  });

  describe('getPayment', () => {
    it('should throw NotFoundException if payment records are missing', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValue(null);

      await expect(service.getPayment('user-1', 'order-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw ForbiddenException if resource belongs to someone else', async () => {
      mockPrismaService.payment.findUnique.mockResolvedValue({
        id: 'pm-1',
        order: { userId: 'user-attacker' },
      });

      await expect(service.getPayment('user-1', 'order-1')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should securely return internal data if user ownership is valid', async () => {
      const mockResult = { id: 'pm-1', order: { userId: 'user-1' } };
      mockPrismaService.payment.findUnique.mockResolvedValue(mockResult);

      const result = await service.getPayment('user-1', 'order-1');
      expect(result).toEqual(mockResult);
    });
  });

  describe('findAll', () => {
    it('should safely execute paginated transaction scope and output built response structures', async () => {
      const mockPayments = [{ id: 'pm-1', amount: 500 }];
      mockPrismaService.payment.findMany.mockResolvedValue(mockPayments);
      mockPrismaService.payment.count.mockResolvedValue(1);

      const query = { skip: 0, limit: 10, page: 1 };
      const result = await service.findAll(query);

      expect(mockPrismaService.payment.findMany).toHaveBeenCalled();
      expect(buildPaginated).toHaveBeenCalledWith(mockPayments, 1, 1, 10);
      expect(result.data).toEqual(mockPayments);
    });
  });
});
