import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { calcSubtotal, toNumber } from '../common/helpers/price.hepler.js';

import { AddCartItemDto } from './dto/add-cart-item.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { PromotionsService } from '../promotions/promotions.service.js';
import { UpdateCartItemDto } from './dto/update-cart-item.dto.js';
import { uuidv7 } from 'uuidv7';

@Injectable()
export class CartService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly promotionsService: PromotionsService,
  ) {}

  async getCart(userId: string) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    slug: true,
                    status: true,
                    categoryId: true,
                    brandId: true,
                  },
                },
                images: { orderBy: { order: 'asc' }, take: 1 },
                inventory: {
                  select: { quantity: true, reservedQuantity: true },
                },
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!cart) return { items: [], subtotal: 0 };

    const productsInput = cart.items.map((item) => item.variant.product);
    const discountMap =
      await this.promotionsService.resolveDiscountPercentForProducts(
        productsInput,
      );

    const itemsWithEffectivePrice = cart.items.map((item) => {
      const originalPrice = toNumber(item.variant.price);
      const discountPercent = discountMap.get(item.variant.product.id);

      const salePrice = this.promotionsService.calculateSalePrice(
        originalPrice,
        discountPercent,
      );

      const effectivePrice = salePrice !== null ? salePrice : originalPrice;

      return {
        ...item,
        variant: {
          ...item.variant,
          price: originalPrice,
          salePrice,
        },
        effectivePrice,
      };
    });

    const subtotal = calcSubtotal(
      itemsWithEffectivePrice.map((item) => ({
        price: item.effectivePrice,
        quantity: item.quantity,
      })),
    );

    return {
      ...cart,
      items: itemsWithEffectivePrice,
      subtotal,
    };
  }

  async addItem(userId: string, dto: AddCartItemDto) {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: dto.variantId },
      include: { inventory: true, product: true },
    });

    if (!variant)
      throw new NotFoundException(`Variant #${dto.variantId} not found`);
    if (variant.product.status !== 'PUBLISHED') {
      throw new BadRequestException('Product is not available');
    }

    const available =
      (variant.inventory?.quantity ?? 0) -
      (variant.inventory?.reservedQuantity ?? 0);
    if (available < dto.quantity) {
      throw new BadRequestException(`Only ${available} items available`);
    }

    const cart = await this.prisma.cart.upsert({
      where: { userId },
      create: { id: uuidv7(), userId },
      update: {},
    });

    const existing = await this.prisma.cartItem.findUnique({
      where: {
        cartId_variantId: { cartId: cart.id, variantId: dto.variantId },
      },
    });

    if (existing) {
      const newQty = existing.quantity + dto.quantity;
      if (newQty > available) {
        throw new BadRequestException(`Only ${available} items available`);
      }

      return this.prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: newQty },
      });
    }

    return this.prisma.cartItem.create({
      data: {
        id: uuidv7(),
        cartId: cart.id,
        variantId: dto.variantId,
        quantity: dto.quantity,
      },
    });
  }

  async updateItem(userId: string, itemId: string, dto: UpdateCartItemDto) {
    const item = await this.assertCartItemOwner(userId, itemId);

    if (dto.quantity === 0) {
      return this.prisma.cartItem.delete({ where: { id: itemId } });
    }

    const variant = await this.prisma.productVariant.findUnique({
      where: { id: item.variantId },
      include: { inventory: true },
    });

    const available =
      (variant?.inventory?.quantity ?? 0) -
      (variant?.inventory?.reservedQuantity ?? 0);

    if (dto.quantity > available) {
      throw new BadRequestException(`Only ${available} items available`);
    }

    return this.prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity: dto.quantity },
    });
  }

  async removeItem(userId: string, itemId: string) {
    await this.assertCartItemOwner(userId, itemId);
    return this.prisma.cartItem.delete({ where: { id: itemId } });
  }

  async clearCart(userId: string) {
    const cart = await this.prisma.cart.findUnique({ where: { userId } });
    if (!cart) return { message: 'Cart is already empty' };

    await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    return { message: 'Cart cleared' };
  }

  private async assertCartItemOwner(userId: string, itemId: string) {
    const item = await this.prisma.cartItem.findFirst({
      where: {
        id: itemId,
        cart: { userId },
      },
    });
    if (!item) throw new NotFoundException(`Cart item #${itemId} not found`);

    return item;
  }
}
