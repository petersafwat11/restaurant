'use client';

import { getApiClient } from '@/lib/api-client';
import { notify } from '@/lib/notify';
import type { ApiError } from '@repo/api-client';
import type { ReviewDto, ReviewListDto, ReviewListQuery } from '@repo/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

const reviewKeys = {
  all: ['reviews'] as const,
  admin: (q?: ReviewListQuery) => ['reviews', 'admin', q ?? {}] as const,
};

export function useAdminReviews(q?: ReviewListQuery) {
  return useQuery<ReviewListDto>({
    queryKey: reviewKeys.admin(q),
    queryFn: () => getApiClient().reviews.listAdmin(q),
  });
}

export function useToggleReviewVisibility() {
  const qc = useQueryClient();
  return useMutation<ReviewDto, ApiError, { id: string; isVisible: boolean }>({
    mutationFn: ({ id, isVisible }) => getApiClient().reviews.moderate(id, isVisible),
    onSuccess: () => qc.invalidateQueries({ queryKey: reviewKeys.all }),
    onError: (err) => notify('error', err.message),
  });
}
