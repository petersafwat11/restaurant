'use client';

import { getApiClient } from '@/lib/api-client';
import { notify } from '@/lib/notify';
import type { ApiError } from '@repo/api-client';
import type { CreateReviewDto, ReviewDto, ReviewListDto } from '@repo/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as React from 'react';

export function useCreateReview() {
  const qc = useQueryClient();
  return useMutation<ReviewDto, ApiError, CreateReviewDto>({
    mutationFn: (input) => getApiClient().reviews.create(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reviews'] }),
    onError: (err) => notify('error', err.message),
  });
}

export function useMyReviews() {
  return useQuery<ReviewListDto>({
    queryKey: ['reviews', 'me'],
    queryFn: () => getApiClient().reviews.listMine(),
  });
}

/**
 * Set of order ids the current user has already reviewed, derived from
 * {@link useMyReviews}. Note the source list is cursor-paginated, so this is a
 * best-effort hint for hiding the "Write a review" CTA — the backend's
 * one-per-order 400 is the real backstop (see ReviewDialog).
 */
export function useReviewedOrderIds(): Set<string> {
  const query = useMyReviews();
  return React.useMemo(
    () => new Set((query.data?.items ?? []).map((r) => r.orderId)),
    [query.data],
  );
}
