import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { ProductStatus } from '../generated/prisma/enums.js';

export interface RecycleBinItem {
  id: string;
  name: string;
  type: 'product' | 'coupon' | 'brand' | 'category' | 'campaign';
  deletedAt: Date;
  canDeletePermanently: boolean;
  daysRemaining: number;
}

@Injectable()
export class RecycleBinService {
  constructor(private readonly prisma: PrismaService) { }

  async getItems(): Promise<RecycleBinItem[]> {
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    const now = new Date();

    const mapItem = (item: any, type: RecycleBinItem['type'], nameField: string = 'name'): RecycleBinItem => {
      const deletedAt = item.updatedAt;
      const timeSinceDeleted = now.getTime() - new Date(deletedAt).getTime();
      const canDeletePermanently = timeSinceDeleted >= thirtyDaysMs;
      const daysRemaining = Math.max(0, Math.ceil((thirtyDaysMs - timeSinceDeleted) / (24 * 60 * 60 * 1000)));

      return {
        id: item.id,
        name: item[nameField],
        type,
        deletedAt,
        canDeletePermanently,
        daysRemaining,
      };
    };

    // Query all soft-deleted items
    const [products, coupons, brands, categories, campaigns] = await Promise.all([
      this.prisma.product.findMany({ where: { status: ProductStatus.ARCHIVED } }),
      this.prisma.coupon.findMany({ where: { isActive: false } }),
      this.prisma.brand.findMany({ where: { isActive: false } }),
      this.prisma.category.findMany({ where: { isActive: false } }),
      this.prisma.campaign.findMany({ where: { isActive: false } }),
    ]);

    return [
      ...products.map(item => mapItem(item, 'product')),
      ...coupons.map(item => mapItem(item, 'coupon', 'code')),
      ...brands.map(item => mapItem(item, 'brand')),
      ...categories.map(item => mapItem(item, 'category')),
      ...campaigns.map(item => mapItem(item, 'campaign')),
    ];
  }

  async restoreItem(type: string, id: string) {
    switch (type) {
      case 'product':
        return this.prisma.product.update({
          where: { id },
          data: { status: ProductStatus.DRAFT }, // Restore to draft state
        });
      case 'coupon':
        return this.prisma.coupon.update({
          where: { id },
          data: { isActive: true },
        });
      case 'brand':
        return this.prisma.brand.update({
          where: { id },
          data: { isActive: true },
        });
      case 'category':
        return this.prisma.category.update({
          where: { id },
          data: { isActive: true },
        });
      case 'campaign':
        return this.prisma.campaign.update({
          where: { id },
          data: { isActive: true },
        });
      default:
        throw new BadRequestException(`Invalid type: ${type}`);
    }
  }

  async deletePermanently(type: string, id: string) {
    let item: any = null;

    // 1. Fetch item to verify it exists and is soft-deleted
    switch (type) {
      case 'product':
        item = await this.prisma.product.findUnique({ where: { id } });
        if (!item || item.status !== ProductStatus.ARCHIVED) {
          throw new BadRequestException('Item is not archived or does not exist');
        }
        break;
      case 'coupon':
        item = await this.prisma.coupon.findUnique({ where: { id } });
        if (!item || item.isActive) {
          throw new BadRequestException('Item is not inactive or does not exist');
        }
        break;
      case 'brand':
        item = await this.prisma.brand.findUnique({ where: { id } });
        if (!item || item.isActive) {
          throw new BadRequestException('Item is not inactive or does not exist');
        }
        break;
      case 'category':
        item = await this.prisma.category.findUnique({ where: { id } });
        if (!item || item.isActive) {
          throw new BadRequestException('Item is not inactive or does not exist');
        }
        break;
      case 'campaign':
        item = await this.prisma.campaign.findUnique({ where: { id } });
        if (!item || item.isActive) {
          throw new BadRequestException('Item is not inactive or does not exist');
        }
        break;
      default:
        throw new BadRequestException(`Invalid type: ${type}`);
    }

    if (!item) {
      throw new NotFoundException('Item not found');
    }

    // 2. Verify it has been soft-deleted for more than 30 days
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    const timeSinceDeleted = Date.now() - new Date(item.updatedAt).getTime();

    if (timeSinceDeleted < thirtyDaysMs) {
      const daysRemaining = Math.max(0, Math.ceil((thirtyDaysMs - timeSinceDeleted) / (24 * 60 * 60 * 1000)));
      throw new BadRequestException(
        `Item cannot be permanently deleted yet. Please wait another ${daysRemaining} days.`
      );
    }

    // 3. Execute permanent hard-delete
    switch (type) {
      case 'product':
        return this.prisma.product.delete({ where: { id } });
      case 'coupon':
        return this.prisma.coupon.delete({ where: { id } });
      case 'brand':
        return this.prisma.brand.delete({ where: { id } });
      case 'category':
        return this.prisma.category.delete({ where: { id } });
      case 'campaign':
        return this.prisma.campaign.delete({ where: { id } });
    }
  }
}
