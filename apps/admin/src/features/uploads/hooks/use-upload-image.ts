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
 * Direct multipart upload to the API — server writes to local disk and
 * returns `{ publicUrl, key }`. Caller wires `key` into the relevant DB row
 * (e.g. useAddMenuItemImage).
 */
export function useUploadImage() {
  return useMutation<UploadImageResult, ApiError | Error, UploadImageInput>({
    mutationFn: async ({ file, kind }) => {
      return await getApiClient().uploads.upload({ file, kind });
    },
    onError: (err) => notify('error', err.message),
  });
}
