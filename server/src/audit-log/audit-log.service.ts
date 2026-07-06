import { AuditAction, Role } from '../generated/prisma/enums.js';

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

  async getActivitySummary(currentUser: { id: string; role: Role }) {
    if (currentUser.role === Role.STAFF) {
      const me = await this.prisma.user.findUnique({
        where: { id: currentUser.id },
        select: { id: true, name: true, email: true, role: true },
      });
      const totalActions = await this.prisma.auditLog.count({
        where: { performedBy: currentUser.id },
      });
      const last = await this.prisma.auditLog.findFirst({
        where: { performedBy: currentUser.id },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      });

      return [
        {
          ...me,
          totalActions,
          lastActionAt: last?.createdAt ?? null,
        },
      ];
    }

    const grouped = await this.prisma.auditLog.groupBy({
      by: ['performedBy'],
      _count: { _all: true },
      _max: { createdAt: true },
    });

    const userIds = grouped
      .map((g) => g.performedBy)
      .filter((id): id is string => !!id);

    const users = await this.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true, role: true },
    });

    return grouped
      .map((g) => {
        const user = users.find((u) => u.id === g.performedBy);
        return {
          id: g.performedBy,
          name: user?.name ?? 'Người dùng không xác định',
          email: user?.email ?? '-',
          role: user?.role ?? null,
          totalActions: g._count._all,
          lastActionAt: g._max.createdAt,
        };
      })
      .sort(
        (a, b) =>
          new Date(b.lastActionAt ?? 0).getTime() -
          new Date(a.lastActionAt ?? 0).getTime(),
      );
  }

  async findAll(
    query: PaginationDto & { entityType?: string; performedBy?: string },
    currentUser: { id: string; role: Role },
  ) {
    const performedBy =
      currentUser.role === Role.STAFF ? currentUser.id : query.performedBy;

    const where = {
      ...(query.entityType && { entityType: query.entityType }),
      ...(performedBy && { performedBy }),
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
