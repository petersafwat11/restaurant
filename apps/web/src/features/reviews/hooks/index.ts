'use client';

import { getApiClient } from '@/lib/api-client';
import { notify } from '@/lib/notify';
import type { ApiError } from '@repo/api-client';
import type { CreateReviewDto, ReviewDto, ReviewListDto, ReviewListQuery } from '@repo/types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

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

export function useReviews(q?: ReviewListQuery) {
  return useQuery<ReviewListDto>({
    queryKey: ['reviews', 'list', q ?? {}],
    queryFn: () => getApiClient().reviews.list(q),
  });
}
