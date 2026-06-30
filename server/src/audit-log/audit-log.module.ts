import { Global, Module } from '@nestjs/common';

import { AuditLogAdminController } from './audit-log-admin.controller.js';
import { AuditLogInterceptor } from './interceptors/audit-log.interceptor.js';
import { AuditLogService } from './audit-log.service.js';

@Global()
@Module({
  controllers: [AuditLogAdminController],
  providers: [AuditLogService, AuditLogInterceptor],
  exports: [AuditLogService, AuditLogInterceptor],
})
export class AuditLogModule {}
