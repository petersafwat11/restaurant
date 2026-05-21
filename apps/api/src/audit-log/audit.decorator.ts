import { SetMetadata } from '@nestjs/common';

export const AUDIT_ACTION_KEY = 'auditAction';

export interface AuditActionMeta {
  action: string;
  resourceType: string;
  /** Where to read the resource id from the response (default: 'id'). */
  idFrom: string;
}

export interface AuditActionOptions {
  idFrom?: string;
}

export const AuditAction = (
  action: string,
  resourceType: string,
  opts: AuditActionOptions = {},
) =>
  SetMetadata(AUDIT_ACTION_KEY, {
    action,
    resourceType,
    idFrom: opts.idFrom ?? 'id',
  } as AuditActionMeta);
