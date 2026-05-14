'use client';

import { getApiClient } from '@/lib/api-client';
import type { AuditLogListDto, AuditLogListQuery } from '@repo/types';
import { useQuery } from '@tanstack/react-query';

export function useAuditLog(q?: AuditLogListQuery) {
  return useQuery<AuditLogListDto>({
    queryKey: ['audit-log', q ?? {}],
    queryFn: () => getApiClient().audit.list(q),
  });
}
