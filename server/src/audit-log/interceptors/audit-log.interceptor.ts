import {
  AUDITABLE_KEY,
  AuditableOptions,
} from '../decorators/auditable.decorator.js';
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';

import { AuditLogService } from '../audit-log.service.js';
import { Reflector } from '@nestjs/core';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(
    private readonly reflector: Reflector,
    private readonly auditLogService: AuditLogService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const options = this.reflector.get<AuditableOptions>(
      AUDITABLE_KEY,
      context.getHandler(),
    );

    if (!options) return next.handle();

    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;
    const entityId = request.params?.id;
    const ipAddress = request.ip;

    return next.handle().pipe(
      tap((result) => {
        void this.auditLogService.create({
          entityType: options.entityType.toUpperCase(),
          entityId: entityId ?? (result?.id as string) ?? 'unknown',
          action: options.action,
          newValue: result,
          performedBy: userId,
          ipAddress,
        });
      }),
    );
  }
}
