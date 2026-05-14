'use client';

import { useEffect, useState } from 'react';
import { getApiClient } from '@/lib/api-client';
import { notify } from '@/lib/notify';
import type { ApiError } from '@repo/api-client';
import type { CreateExportDto, ExportDto } from '@repo/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

const exportKeys = {
  all: ['exports'] as const,
  detail: (id: string) => ['exports', id] as const,
};

export function useCreateExport() {
  const qc = useQueryClient();
  return useMutation<ExportDto, ApiError, CreateExportDto>({
    mutationFn: (input) => getApiClient().reports.createExport(input),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: exportKeys.all });
      qc.setQueryData(exportKeys.detail(data.id), data);
    },
    onError: (err) => notify('error', err.message),
  });
}

export function useExports() {
  return useQuery<ExportDto[]>({
    queryKey: exportKeys.all,
    queryFn: () => getApiClient().reports.listExports(),
  });
}

export function useExportStatus(exportId: string | null) {
  return useQuery<ExportDto>({
    queryKey: exportId ? exportKeys.detail(exportId) : ['exports', 'pending'],
    queryFn: () => getApiClient().reports.getExport(exportId as string),
    enabled: Boolean(exportId),
    refetchInterval: (q) => {
      const status = (q.state.data as ExportDto | undefined)?.status;
      if (!status) return 2000;
      return status === 'queued' || status === 'processing' ? 2000 : false;
    },
  });
}

export function useDownloadExport() {
  return useMutation<void, ApiError, string>({
    mutationFn: async (exportId) => {
      const url = getApiClient().reports.downloadUrl(exportId);
      window.open(url, '_blank');
    },
  });
}

/**
 * Composite hook: create → poll status → expose download.
 */
export function useExportFlow() {
  const [exportId, setExportId] = useState<string | null>(null);
  const create = useCreateExport();
  const status = useExportStatus(exportId);

  useEffect(() => {
    if (create.data && create.data.id !== exportId) {
      setExportId(create.data.id);
    }
  }, [create.data, exportId]);

  return {
    start: (input: CreateExportDto) => create.mutate(input),
    status: status.data?.status ?? null,
    exportId,
    downloadUrl: status.data?.status === 'ready' && exportId
      ? getApiClient().reports.downloadUrl(exportId)
      : null,
    error: create.error ?? status.error ?? null,
    reset: () => {
      setExportId(null);
      create.reset();
    },
  };
}
