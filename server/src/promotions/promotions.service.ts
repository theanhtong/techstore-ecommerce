import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { AddPromotionProductDto } from './dto/add-promotion-product.dto.js';
import { CampaignsService } from '../campaigns/campaigns.service.js';
import { CreatePromotionDto } from './dto/create-promotion.dto.js';
import { PaginationDto } from '../common/dto/pagination.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { PromotionScope } from '../generated/prisma/enums.js';
import { UpdatePromotionDto } from './dto/update-promotion.dto.js';
import { buildPaginated } from '../common/helpers/pagination.helper.js';
import { toNumber } from '../common/helpers/price.hepler.js';
import { uuidv7 } from 'uuidv7';

const SCOPE_RANK: Record<PromotionScope, number> = {
  PRODUCT: 3,
  BRAND: 2,
  CATEGORY: 1,
};

export interface ResolvedPrice {
  price: number;
  salePrice: number | null;
  appliedPromotionId: string | null;
}

interface ProductScopeInput {
  id: string;
  categoryId: string;
  brandId: string | null;
}

@Injectable()
export class PromotionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly campaignsService: CampaignsService,
  ) {}

  async create(dto: CreatePromotionDto) {
    if (dto.campaignId) {
      const campaign = await this.prisma.campaign.findUnique({
        where: { id: dto.campaignId },
      });
      if (!campaign)
        throw new NotFoundException(`Campaign #${dto.campaignId} not found`);
    }

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
        campaign: { select: { id: true, name: true, isActive: true } },
        promotionProducts: {
          include: {
            product: { select: { id: true, name: true, slug: true } },
            category: { select: { id: true, name: true, slug: true } },
            brand: { select: { id: true, name: true, slug: true } },
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

    const scopeCount = [dto.productId, dto.categoryId, dto.brandId].filter(
      Boolean,
    ).length;
    if (scopeCount !== 1) {
      throw new BadRequestException(
        'Phải chọn đúng 1 trong 3: productId, categoryId, hoặc brandId',
      );
    }

    if (dto.discountType === 'FIXED_AMOUNT') {
      throw new BadRequestException(
        'Giảm giá theo Product/Category/Brand chỉ hỗ trợ PERCENTAGE. ' +
          'Dùng Coupon (cấp order) nếu cần giảm giá cố định.',
      );
    }

    const scope: PromotionScope = dto.productId
      ? PromotionScope.PRODUCT
      : dto.categoryId
        ? PromotionScope.CATEGORY
        : PromotionScope.BRAND;

    if (dto.productId) {
      const product = await this.prisma.product.findUnique({
        where: { id: dto.productId },
      });
      if (!product) throw new NotFoundException('Product not found');
    }
    if (dto.categoryId) {
      const category = await this.prisma.category.findUnique({
        where: { id: dto.categoryId },
      });
      if (!category) throw new NotFoundException('Category not found');
    }
    if (dto.brandId) {
      const brand = await this.prisma.brand.findUnique({
        where: { id: dto.brandId },
      });
      if (!brand) throw new NotFoundException('Brand not found');
    }

    return this.prisma.promotionProduct.create({
      data: {
        id: uuidv7(),
        promotionId,
        scope,
        productId: dto.productId,
        categoryId: dto.categoryId,
        brandId: dto.brandId,
        discountType: dto.discountType,
        discountValue: dto.discountValue,
      },
    });
  }

  async removeProduct(promotionId: string, promotionProductId: string) {
    const pp = await this.prisma.promotionProduct.findFirst({
      where: { id: promotionProductId, promotionId },
    });
    if (!pp) throw new NotFoundException('Promotion product not found');

    return this.prisma.promotionProduct.delete({
      where: { id: promotionProductId },
    });
  }

  async isEffective(promotionId: string): Promise<boolean> {
    const promotion = await this.prisma.promotion.findUnique({
      where: { id: promotionId },
      include: { campaign: true },
    });
    if (!promotion || !promotion.isActive) return false;

    const now = new Date();
    if (promotion.startsAt && promotion.startsAt > now) return false;
    if (promotion.endsAt && promotion.endsAt < now) return false;

    if (
      promotion.campaign &&
      !this.campaignsService.isWithinPeriod(promotion.campaign)
    ) {
      return false;
    }

    return true;
  }

  async resolveDiscountPercentForProducts(
    products: ProductScopeInput[],
  ): Promise<Map<string, number>> {
    const result = new Map<string, number>();
    if (products.length === 0) return result;

    const productIds = products.map((p) => p.id);
    const categoryIds = [...new Set(products.map((p) => p.categoryId))];
    const brandIds = [
      ...new Set(products.map((p) => p.brandId).filter(Boolean) as string[]),
    ];
    const now = new Date();

    const candidates = await this.prisma.promotionProduct.findMany({
      where: {
        OR: [
          { productId: { in: productIds } },
          { categoryId: { in: categoryIds } },
          ...(brandIds.length ? [{ brandId: { in: brandIds } }] : []),
        ],
        promotion: {
          isActive: true,
          OR: [{ startsAt: null }, { startsAt: { lte: now } }],
          AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
        },
      },
      include: { promotion: { include: { campaign: true } } },
    });

    const valid = candidates.filter(
      (c) =>
        !c.promotion.campaign ||
        this.campaignsService.isWithinPeriod(c.promotion.campaign),
    );

    for (const product of products) {
      const applicable = valid.filter(
        (c) =>
          c.productId === product.id ||
          c.categoryId === product.categoryId ||
          (product.brandId && c.brandId === product.brandId),
      );
      if (applicable.length === 0) continue;

      const winner = applicable.sort((a, b) => {
        const rankDiff = SCOPE_RANK[b.scope] - SCOPE_RANK[a.scope];
        if (rankDiff !== 0) return rankDiff;
        return b.promotion.priority - a.promotion.priority;
      })[0];

      result.set(product.id, toNumber(winner.discountValue));
    }

    return result;
  }

  async resolveEffectivePrice(variantId: string): Promise<ResolvedPrice> {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: variantId },
      select: {
        price: true,
        product: { select: { id: true, categoryId: true, brandId: true } },
      },
    });
    if (!variant) throw new NotFoundException('Variant not found');

    const discountMap = await this.resolveDiscountPercentForProducts([
      variant.product,
    ]);
    const price = toNumber(variant.price);
    const discountPercent = discountMap.get(variant.product.id);

    if (discountPercent === undefined) {
      return { price, salePrice: null, appliedPromotionId: null };
    }

    const salePrice = Math.max(price - (price * discountPercent) / 100, 0);
    return { price, salePrice, appliedPromotionId: null };
  }

  calculateSalePrice(
    price: number,
    discountPercent: number | undefined,
  ): number | null {
    if (discountPercent === undefined) return null;
    return Math.max(price - (price * discountPercent) / 100, 0);
  }
}
