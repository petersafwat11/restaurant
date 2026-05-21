'use client';

import { getApiClient } from '@/lib/api-client';
import { triggerBrowserDownload } from '@/lib/download';
import { notify } from '@/lib/notify';
import type { ApiError } from '@repo/api-client';
import type { CreateExportDto, ExportDto } from '@repo/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

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
      notify('success', 'Export queued — we’ll let you know when it’s ready');
    },
    onError: (err) => notify('error', err.message),
  });
}

export function useExports() {
  return useQuery<ExportDto[]>({
    queryKey: exportKeys.all,
    queryFn: () => getApiClient().reports.listExports(),
    refetchInterval: (q) => {
      const data = q.state.data as ExportDto[] | undefined;
      if (!data) return false;
      const hasPending = data.some((r) => r.status === 'queued' || r.status === 'processing');
      return hasPending ? 3000 : false;
    },
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
      const { blob, filename } = await getApiClient().reports.download(exportId);
      triggerBrowserDownload(blob, filename);
    },
    onError: (err) => notify('error', err.message),
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

  const ready = status.data?.status === 'ready' && Boolean(exportId);
  const download = useDownloadExport();

  return {
    start: (input: CreateExportDto) => create.mutate(input),
    status: status.data?.status ?? null,
    exportId,
    canDownload: ready,
    download: () => {
      if (exportId && ready) download.mutate(exportId);
    },
    error: create.error ?? status.error ?? null,
    reset: () => {
      setExportId(null);
      create.reset();
    },
  };
}
