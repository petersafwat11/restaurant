import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuditLogListQuerySchema } from '@repo/types';
import type { AuditLogListQuery } from '@repo/types';
import { Permissions } from '../common/decorators/permissions.decorator';
import { ZodValidationPipe } from '../common/pipes/zod-validation.pipe';
import { AuditService } from './audit.service';

@ApiTags('audit-log')
@Permissions('audit:read')
@Controller('admin/audit-log')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  list(@Query(new ZodValidationPipe(AuditLogListQuerySchema)) q: AuditLogListQuery) {
    return this.audit.list(q);
  }
}
