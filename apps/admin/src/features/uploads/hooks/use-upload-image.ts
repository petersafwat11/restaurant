'use client';

import { getApiClient } from '@/lib/api-client';
import { notify } from '@/lib/notify';
import type { ApiError } from '@repo/api-client';
import type { UploadKind } from '@repo/types';
import { useMutation } from '@tanstack/react-query';

export interface UploadImageInput {
  file: File;
  kind: UploadKind;
}

export interface UploadImageResult {
  publicUrl: string;
  key: string;
}

/**
 * Composite hook: presign → PUT file directly to R2 (or the stub URL in dev) →
 * return { publicUrl, key }. Caller is responsible for creating the actual
 * `MenuItemImage` row via useAddMenuItemImage(key).
 */
export function useUploadImage() {
  return useMutation<UploadImageResult, ApiError | Error, UploadImageInput>({
    mutationFn: async ({ file, kind }) => {
      const presigned = await getApiClient().uploads.presign({
        kind,
        mimeType: file.type as 'image/jpeg' | 'image/png' | 'image/webp',
        sizeBytes: file.size,
      });

      // Stub mode in dev returns a fake host we can't actually PUT to. The
      // presigned URL begins with "http://localhost/no-r2/" — short-circuit.
      if (!presigned.uploadUrl.startsWith('http://localhost/no-r2/')) {
        const put = await fetch(presigned.uploadUrl, {
          method: 'PUT',
          headers: { 'Content-Type': file.type },
          body: file,
        });
        if (!put.ok) {
          throw new Error(`Upload failed: ${put.status} ${put.statusText}`);
        }
      }

      return { publicUrl: presigned.publicUrl, key: presigned.key };
    },
    onError: (err) => notify('error', err.message),
  });
}
