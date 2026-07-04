import { Injectable, NotFoundException } from '@nestjs/common';

import { CreateCampaignDto } from './dto/create-campaign.dto.js';
import { PaginationDto } from '../common/dto/pagination.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { UpdateCampaignDto } from './dto/update-campaign.dto.js';
import { buildPaginated } from '../common/helpers/pagination.helper.js';
import { uuidv7 } from 'uuidv7';

@Injectable()
export class CampaignsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCampaignDto) {
    return this.prisma.campaign.create({
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
      this.prisma.campaign.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { promotions: true, coupons: true } },
        },
      }),
      this.prisma.campaign.count({ where }),
    ]);

    return buildPaginated(data, total, query.page, query.limit);
  }

  async findOne(id: string) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id },
      include: {
        promotions: {
          select: { id: true, name: true, isActive: true },
        },
        coupons: {
          select: {
            id: true,
            code: true,
            discountType: true,
            discountValue: true,
            usageLimit: true,
            usedCount: true,
            startsAt: true,
            endsAt: true,
            isActive: true,
          },
        },
      },
    });
    if (!campaign) throw new NotFoundException(`Campaign #${id} not found`);
    return campaign;
  }

  async update(id: string, dto: UpdateCampaignDto) {
    await this.findOne(id);

    return this.prisma.campaign.update({
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
    return this.prisma.campaign.update({
      where: { id },
      data: { isActive: false },
    });
  }

  isWithinPeriod(campaign: { startsAt: Date | null; endsAt: Date | null }) {
    const now = new Date();
    if (campaign.startsAt && campaign.startsAt > now) return false;
    if (campaign.endsAt && campaign.endsAt < now) return false;
    return true;
  }
}
