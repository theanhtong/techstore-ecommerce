import { AuditAction } from '../generated/prisma/enums.js';
import { Injectable } from '@nestjs/common';
import { PaginationDto } from '../common/dto/pagination.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { buildPaginated } from '../common/helpers/pagination.helper.js';
import { uuidv7 } from 'uuidv7';

interface CreateAuditLogInput {
  entityType: string;
  entityId: string;
  action: AuditAction;
  oldValue?: unknown;
  newValue?: unknown;
  performedBy?: string;
  ipAddress?: string;
}

@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateAuditLogInput) {
    return this.prisma.auditLog.create({
      data: {
        id: uuidv7(),
        entityType: input.entityType,
        entityId: input.entityId,
        action: input.action,
        oldValue: input.oldValue as never,
        newValue: input.newValue as never,
        performedBy: input.performedBy,
        ipAddress: input.ipAddress,
      },
    });
  }

  async findAll(query: PaginationDto & { entityType?: string }) {
    const where = {
      ...(query.entityType && { entityType: query.entityType }),
    };

    const [data, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        skip: query.skip,
        take: query.limit,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { id: true, name: true, email: true } } },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return buildPaginated(data, total, query.page, query.limit);
  }

  async findByEntity(entityType: string, entityId: string) {
    return this.prisma.auditLog.findMany({
      where: { entityType, entityId },
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
  }
}
