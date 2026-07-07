import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { CampaignsService } from '../campaigns/campaigns.service.js';
import { CreateCouponDto } from './dto/create-coupon.dto.js';
import { PaginationDto } from '../common/dto/pagination.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { UpdateCouponDto } from './dto/update-coupon.dto.js';
import { ValidateCouponDto } from './dto/validate-coupon.dto.js';
import { buildPaginated } from '../common/helpers/pagination.helper.js';
import { clampToCampaignPeriod } from '../common/helpers/campaign-period.helper.js';
import { toNumber } from '../common/helpers/price.hepler.js';
import { uuidv7 } from 'uuidv7';

@Injectable()
export class CouponsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly campaignsService: CampaignsService,
  ) { }

  async create(dto: CreateCouponDto) {
    const existing = await this.prisma.coupon.findUnique({
      where: { code: dto.code },
    });
    if (existing)
      throw new ConflictException(`Coupon code "${dto.code}" already exists`);

    let startsAt = dto.startsAt ? new Date(dto.startsAt) : null;
    let endsAt = dto.endsAt ? new Date(dto.endsAt) : null;

    if (dto.campaignId) {
      const campaign = await this.prisma.campaign.findUnique({
        where: { id: dto.campaignId },
      });
      if (!campaign)
        throw new NotFoundException(`Campaign #${dto.campaignId} not found`);

      const clamped = clampToCampaignPeriod(campaign, dto.startsAt, dto.endsAt);
      startsAt = clamped.startsAt;
      endsAt = clamped.endsAt;
    }

    return this.prisma.coupon.create({
      data: {
        id: uuidv7(),
        ...dto,
        startsAt,
        endsAt,
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
        include: { campaign: { select: { id: true, name: true, isActive: true } }, },
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
    const existing = await this.findOne(id);

    if (dto.code) {
      const codeOwner = await this.prisma.coupon.findUnique({
        where: { code: dto.code },
      });
      if (codeOwner && codeOwner.id !== id) {
        throw new ConflictException(`Coupon code "${dto.code}" already exists`);
      }
    }

    const campaignId =
      dto.campaignId !== undefined ? dto.campaignId : existing.campaignId;

    let startsAt =
      dto.startsAt !== undefined
        ? dto.startsAt
          ? new Date(dto.startsAt)
          : null
        : existing.startsAt;
    let endsAt =
      dto.endsAt !== undefined
        ? dto.endsAt
          ? new Date(dto.endsAt)
          : null
        : existing.endsAt;

    if (campaignId) {
      const campaign = await this.prisma.campaign.findUnique({
        where: { id: campaignId },
      });
      if (!campaign)
        throw new NotFoundException(`Campaign #${campaignId} not found`);

      const clamped = clampToCampaignPeriod(
        campaign,
        startsAt?.toISOString(),
        endsAt?.toISOString(),
      );
      startsAt = clamped.startsAt;
      endsAt = clamped.endsAt;
    }

    return this.prisma.coupon.update({
      where: { id },
      data: {
        ...dto,
        startsAt,
        endsAt,
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
      include: {
        usages: { where: { userId } },
        campaign: true,
      },
    });

    if (!coupon) return { isValid: false, message: 'Coupon not found' };
    if (!coupon.isActive)
      return { isValid: false, message: 'Coupon is inactive' };

    if (coupon.startsAt && coupon.startsAt > new Date()) {
      return { isValid: false, message: 'Coupon chưa đến thời gian áp dụng' };
    }
    if (coupon.endsAt && coupon.endsAt < new Date()) {
      return { isValid: false, message: 'Coupon has expired' };
    }
    if (
      coupon.campaign &&
      (!coupon.campaign.isActive ||
        !this.campaignsService.isWithinPeriod(coupon.campaign))
    ) {
      return {
        isValid: false,
        message: 'Chiến dịch của coupon đã kết thúc hoặc bị tạm dừng',
      };
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

  async applyToOrder(userId: string, code: string, subtotal: number, tx?: any) {
    const prismaClient = tx ?? this.prisma;
    const coupon = await prismaClient.coupon.findUnique({
      where: { code },
      include: {
        usages: { where: { userId } },
        campaign: true,
      },
    });

    if (!coupon) throw new BadRequestException('Coupon not found');
    if (!coupon.isActive) throw new BadRequestException('Coupon is inactive');

    if (coupon.startsAt && coupon.startsAt > new Date()) {
      throw new BadRequestException('Coupon chưa đến thời gian áp dụng');
    }
    if (coupon.endsAt && coupon.endsAt < new Date()) {
      throw new BadRequestException('Coupon has expired');
    }
    if (
      coupon.campaign &&
      (!coupon.campaign.isActive ||
        !this.campaignsService.isWithinPeriod(coupon.campaign))
    ) {
      throw new BadRequestException(
        'Chiến dịch của coupon đã kết thúc hoặc bị tạm dừng',
      );
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
