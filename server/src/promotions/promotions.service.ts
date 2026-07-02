import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { AddPromotionProductDto } from './dto/add-promotion-product.dto.js';
import { CreatePromotionDto } from './dto/create-promotion.dto.js';
import { PaginationDto } from '../common/dto/pagination.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { UpdatePromotionDto } from './dto/update-promotion.dto.js';
import { buildPaginated } from '../common/helpers/pagination.helper.js';
import { toNumber } from '../common/helpers/price.hepler.js';
import { uuidv7 } from 'uuidv7';

@Injectable()
export class PromotionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreatePromotionDto) {
    return this.prisma.promotion.create({
      data: {
        id: uuidv7(),
        ...dto,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
      },
    });
  }

  async findAll(query: PaginationDto) {
    const where = {
      ...(query.search && {
        name: { contains: query.search, mode: 'insensitive' as const },
      }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.promotion.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { promotionProducts: true } } },
      }),
      this.prisma.promotion.count({ where }),
    ]);

    return buildPaginated(data, total, query.page, query.limit);
  }

  async findOne(id: string) {
    const promotion = await this.prisma.promotion.findUnique({
      where: { id },
      include: {
        promotionProducts: {
          include: {
            product: { select: { id: true, name: true, slug: true } },
            variant: { select: { id: true, sku: true, price: true } },
          },
        },
        coupons: {
          select: {
            id: true,
            code: true,
            discountType: true,
            discountValue: true,
            usageLimit: true,
            usedCount: true,
            expiresAt: true,
            isActive: true,
          },
        },
      },
    });
    if (!promotion) throw new NotFoundException(`Promotion #${id} not found`);
    return promotion;
  }

  async update(id: string, dto: UpdatePromotionDto) {
    await this.findOne(id);

    return this.prisma.promotion.update({
      where: { id },
      data: {
        ...dto,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.promotion.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async addProduct(promotionId: string, dto: AddPromotionProductDto) {
    await this.findOne(promotionId);

    if (!dto.productId && !dto.variantId) {
      throw new BadRequestException(
        'Either productId or variantId is required',
      );
    }

    const promotionProduct = await this.prisma.promotionProduct.create({
      data: {
        id: uuidv7(),
        promotionId,
        productId: dto.productId,
        variantId: dto.variantId,
        discountType: dto.discountType,
        discountValue: dto.discountValue,
      },
    });

    if (dto.variantId) {
      await this.applySalePrice(
        dto.variantId,
        dto.discountType,
        toNumber(dto.discountValue),
      );
    }

    return promotionProduct;
  }

  async removeProduct(promotionId: string, promotionProductId: string) {
    const pp = await this.prisma.promotionProduct.findFirst({
      where: { id: promotionProductId, promotionId },
    });
    if (!pp) throw new NotFoundException('Promotion product not found');

    if (pp.variantId) {
      await this.prisma.productVariant.update({
        where: { id: pp.variantId },
        data: { salePrice: null, saleStartsAt: null, saleEndsAt: null },
      });
    }

    return this.prisma.promotionProduct.delete({
      where: { id: promotionProductId },
    });
  }

  private async applySalePrice(
    variantId: string,
    discountType: string,
    discountValue: number,
  ) {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: variantId },
    });
    if (!variant) return;

    const price = toNumber(variant.price);
    const salePrice =
      discountType === 'PERCENTAGE'
        ? price - (price * discountValue) / 100
        : price - discountValue;

    await this.prisma.productVariant.update({
      where: { id: variantId },
      data: { salePrice: Math.max(salePrice, 0) },
    });
  }
}
