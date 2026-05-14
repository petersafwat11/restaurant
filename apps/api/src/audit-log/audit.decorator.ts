import { SetMetadata } from '@nestjs/common';

export const AUDIT_ACTION_KEY = 'auditAction';

export interface AuditActionMeta {
  action: string;
  resourceType: string;
  /** Where to read the resource id from the response (default: 'id'). */
  idFrom?: string;
}

export const AuditAction = (action: string, resourceType: string, idFrom = 'id') =>
  SetMetadata(AUDIT_ACTION_KEY, { action, resourceType, idFrom } as AuditActionMeta);
