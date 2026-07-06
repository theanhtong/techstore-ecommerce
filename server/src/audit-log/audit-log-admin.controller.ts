import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuditLogService } from './audit-log.service.js';
import { PaginationDto } from '../common/dto/pagination.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { Role } from '../generated/prisma/enums.js';
import { CurrentUser } from '../auth/decorators/current-user.decorator.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/audit-logs')
export class AuditLogAdminController {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Roles(Role.ADMIN, Role.STAFF)
  @Get('summary')
  getActivitySummary(@CurrentUser() user: { id: string; role: Role }) {
    return this.auditLogService.getActivitySummary(user);
  }

  @Roles(Role.ADMIN, Role.STAFF)
  @Get()
  findAll(
    @Query()
    query: PaginationDto & { entityType?: string; performedBy?: string },
    @CurrentUser() user: { id: string; role: Role },
  ) {
    return this.auditLogService.findAll(query, user);
  }

  @Roles(Role.ADMIN)
  @Get(':entityType/:entityId')
  findByEntity(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ) {
    return this.auditLogService.findByEntity(entityType, entityId);
  }
}
