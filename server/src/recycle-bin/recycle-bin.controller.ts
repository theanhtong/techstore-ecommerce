import { Controller, Get, Post, Delete, Param, UseGuards } from '@nestjs/common';
import { RecycleBinService } from './recycle-bin.service.js';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import { RolesGuard } from '../auth/guards/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { Role } from '../generated/prisma/enums.js';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('Admin Recycle Bin')
@ApiBearerAuth('JWT')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/recycle-bin')
export class RecycleBinController {
  constructor(private readonly recycleBinService: RecycleBinService) {}

  @Get()
  async getItems() {
    return this.recycleBinService.getItems();
  }

  @Post(':type/:id/restore')
  async restoreItem(@Param('type') type: string, @Param('id') id: string) {
    return this.recycleBinService.restoreItem(type, id);
  }

  @Delete(':type/:id')
  async deletePermanently(@Param('type') type: string, @Param('id') id: string) {
    return this.recycleBinService.deletePermanently(type, id);
  }
}
