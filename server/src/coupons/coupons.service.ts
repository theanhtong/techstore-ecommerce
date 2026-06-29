import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { CreateCouponDto } from './dto/create-coupon.dto.js';
import { PaginationDto } from '../common/dto/pagination.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { UpdateCouponDto } from './dto/update-coupon.dto.js';
import { ValidateCouponDto } from './dto/validate-coupon.dto.js';
import { buildPaginated } from '../common/helpers/pagination.helper.js';
import { toNumber } from '../common/helpers/price.hepler.js';
import { uuidv7 } from 'uuidv7';

@Injectable()
export class CouponsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCouponDto) {
    const existing = await this.prisma.coupon.findUnique({
      where: { code: dto.code },
    });
    if (existing)
      throw new ConflictException(`Coupon code "${dto.code}" already exists`);

    return this.prisma.coupon.create({
      data: {
        id: uuidv7(),
        ...dto,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      },
    });
  }

  async findAll(query: PaginationDto) {
    const where = {
      ...(query.search && {
        code: { contains: query.search, mode: 'insensitive' as const },
      }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.coupon.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.coupon.count({ where }),
    ]);

    return buildPaginated(data, total, query.page, query.limit);
  }

  async findOne(id: string) {
    const coupon = await this.prisma.coupon.findUnique({
      where: { id },
      include: {
        usages: {
          orderBy: { usedAt: 'desc' },
          take: 10,
          include: { user: { select: { id: true, name: true, email: true } } },
        },
      },
    });
    if (!coupon) throw new NotFoundException(`Coupon #${id} not found`);
    return coupon;
  }

  async update(id: string, dto: UpdateCouponDto) {
    await this.findOne(id);

    if (dto.code) {
      const existing = await this.prisma.coupon.findUnique({
        where: { code: dto.code },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException(`Coupon code "${dto.code}" already exists`);
      }
    }

    return this.prisma.coupon.update({
      where: { id },
      data: {
        ...dto,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.coupon.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async validate(userId: string, dto: ValidateCouponDto) {
    const coupon = await this.prisma.coupon.findUnique({
      where: { code: dto.code },
      include: { usages: { where: { userId } } },
    });

    if (!coupon) return { isValid: false, message: 'Coupon not found' };
    if (!coupon.isActive)
      return { isValid: false, message: 'Coupon is inactive' };
    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
      return { isValid: false, message: 'Coupon has expired' };
    }
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      return { isValid: false, message: 'Coupon usage limit reached' };
    }
    if (coupon.perUserLimit && coupon.usages.length >= coupon.perUserLimit) {
      return {
        isValid: false,
        message: 'You have reached the usage limit for this coupon',
      };
    }
    if (
      coupon.minOrderValue &&
      dto.orderSubtotal < toNumber(coupon.minOrderValue)
    ) {
      return {
        isValid: false,
        message: `Minimum order value is ${toNumber(coupon.minOrderValue).toLocaleString()}đ`,
      };
    }

    let discountAmount =
      coupon.discountType === 'PERCENTAGE'
        ? (dto.orderSubtotal * toNumber(coupon.discountValue)) / 100
        : toNumber(coupon.discountValue);

    if (coupon.maxDiscount) {
      discountAmount = Math.min(discountAmount, toNumber(coupon.maxDiscount));
    }

    return {
      isValid: true,
      discountAmount,
      finalAmount: dto.orderSubtotal - discountAmount,
      message: 'Coupon is valid',
    };
  }

  async applyToOrder(userId: string, code: string, subtotal: number) {
    const coupon = await this.prisma.coupon.findUnique({
      where: { code },
      include: { usages: { where: { userId } } },
    });

    if (!coupon) throw new BadRequestException('Coupon not found');
    if (!coupon.isActive) throw new BadRequestException('Coupon is inactive');
    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
      throw new BadRequestException('Coupon has expired');
    }
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      throw new BadRequestException('Coupon usage limit reached');
    }
    if (coupon.perUserLimit && coupon.usages.length >= coupon.perUserLimit) {
      throw new BadRequestException(
        'You have reached the usage limit for this coupon',
      );
    }
    if (coupon.minOrderValue && subtotal < toNumber(coupon.minOrderValue)) {
      throw new BadRequestException(
        `Minimum order value is ${toNumber(coupon.minOrderValue).toLocaleString()}đ`,
      );
    }

    let discountAmount =
      coupon.discountType === 'PERCENTAGE'
        ? (subtotal * toNumber(coupon.discountValue)) / 100
        : toNumber(coupon.discountValue);

    if (coupon.maxDiscount) {
      discountAmount = Math.min(discountAmount, toNumber(coupon.maxDiscount));
    }

    return { coupon, discountAmount };
  }
}
