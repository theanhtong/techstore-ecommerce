import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { PromotionsService } from './promotions.service.js';
import { CreatePromotionDto } from './dto/create-promotion.dto.js';
import { UpdatePromotionDto } from './dto/update-promotion.dto.js';
import { AddPromotionProductDto } from './dto/add-promotion-product.dto.js';
import { PaginationDto } from '../common/dto/pagination.dto.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { AuditAction, Role } from '../generated/prisma/enums.js';
import { AuditLogInterceptor } from '../audit-log/interceptors/audit-log.interceptor.js';
import { Auditable } from '../audit-log/decorators/auditable.decorator.js';
import { ApiBearerAuth } from '@nestjs/swagger';

@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.STAFF)
@Controller('admin/promotions')
export class PromotionsAdminController {
  constructor(private readonly promotionsService: PromotionsService) {}

  @Post()
  @UseInterceptors(AuditLogInterceptor)
  @Auditable({ entityType: 'PROMOTION', action: AuditAction.CREATE })
  create(@Body() dto: CreatePromotionDto) {
    return this.promotionsService.create(dto);
  }

  @Get()
  findAll(@Query() query: PaginationDto) {
    return this.promotionsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string) {
    return this.promotionsService.findOne(id);
  }

  @Patch(':id')
  @UseInterceptors(AuditLogInterceptor)
  @Auditable({ entityType: 'PROMOTION', action: AuditAction.UPDATE })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePromotionDto,
  ) {
    return this.promotionsService.update(id, dto);
  }

  @Delete(':id')
  @UseInterceptors(AuditLogInterceptor)
  @Auditable({ entityType: 'PROMOTION', action: AuditAction.DELETE })
  remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.promotionsService.remove(id);
  }

  @Post(':id/products')
  @UseInterceptors(AuditLogInterceptor)
  @Auditable({ entityType: 'PROMOTION_PRODUCT', action: AuditAction.CREATE })
  addProduct(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AddPromotionProductDto,
  ) {
    return this.promotionsService.addProduct(id, dto);
  }

  @Delete(':id/products/:promotionProductId')
  @UseInterceptors(AuditLogInterceptor)
  @Auditable({ entityType: 'PROMOTION_PRODUCT', action: AuditAction.DELETE })
  removeProduct(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('promotionProductId', ParseUUIDPipe) promotionProductId: string,
  ) {
    return this.promotionsService.removeProduct(id, promotionProductId);
  }
}
