'use client';

import { getApiClient } from '@/lib/api-client';
import { notify } from '@/lib/notify';
import type { ApiError } from '@repo/api-client';
import type {
  OwnerReplyDto,
  ReviewDto,
  ReviewListDto,
  ReviewListQuery,
  ReviewModerationStatus,
  ReviewSummaryDto,
} from '@repo/types';
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
    mutationFn: ({ id, isVisible }) =>
      getApiClient().reviews.moderate(id, {
        moderationStatus: isVisible ? 'PUBLISHED' : 'HIDDEN',
      }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: reviewKeys.all });
      notify('success', vars.isVisible ? 'Review shown' : 'Review hidden');
    },
    onError: (err) => notify('error', err.message),
  });
}

export function useModerateReview() {
  const qc = useQueryClient();
  return useMutation<
    ReviewDto,
    ApiError,
    { id: string; status: ReviewModerationStatus; flagReason?: string }
  >({
    mutationFn: ({ id, status, flagReason }) =>
      getApiClient().reviews.moderate(id, {
        moderationStatus: status,
        ...(status === 'FLAGGED' ? { flagReason: flagReason ?? null } : {}),
      }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: reviewKeys.all });
      const label =
        vars.status === 'PUBLISHED'
          ? 'Review published'
          : vars.status === 'FLAGGED'
            ? 'Review flagged'
            : 'Review hidden';
      notify('success', label);
    },
    onError: (err) => notify('error', err.message),
  });
}

export function useReplyToReview() {
  const qc = useQueryClient();
  return useMutation<ReviewDto, ApiError, { id: string; reply: OwnerReplyDto }>({
    mutationFn: ({ id, reply }) => getApiClient().reviews.reply(id, reply),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: reviewKeys.all });
      notify('success', 'Reply posted');
    },
    onError: (err) => notify('error', err.message),
  });
}

export function useReviewSummary() {
  return useQuery<ReviewSummaryDto>({
    queryKey: ['reviews', 'summary'],
    queryFn: () => getApiClient().reviews.summary(),
  });
}
