'use client';

import { usePermissions } from '@/features/auth/hooks/use-permissions';
import { useModerateReview, useReplyToReview } from '@/features/reviews/hooks';
import type { ReviewDto } from '@repo/types';
import { Button, DetailDrawer, RelativeTime, Textarea } from '@repo/ui';
import * as React from 'react';
import { ReviewStars } from './review-stars';

interface Props {
  review: ReviewDto | null;
  onOpenChange: (open: boolean) => void;
}

export function ReviewDrawer({ review, onOpenChange }: Props) {
  const { has } = usePermissions();
  const moderate = useModerateReview();
  const replyMut = useReplyToReview();
  const canModerate = has('review:moderate');

  const [reply, setReply] = React.useState('');
  const [flagReason, setFlagReason] = React.useState('');
  // biome-ignore lint/correctness/useExhaustiveDependencies: reseed only when switching to a different review, not when the cached object is refreshed by a mutation
  React.useEffect(() => {
    setReply(review?.ownerReply ?? '');
  }, [review?.id]);

  const open = review !== null;

  return (
    <DetailDrawer
      open={open}
      onOpenChange={onOpenChange}
      width={560}
      ariaLabel="Review"
      header={
        review && (
          <div className="px-6 py-4">
            <div className="flex items-center justify-between gap-3">
              <ReviewStars rating={review.rating} size={14} />
              <span
                className={`inline-flex h-5 items-center rounded-full px-2 text-[11px] ${
                  review.moderationStatus === 'PUBLISHED'
                    ? 'bg-positive/[0.12] text-positive'
                    : review.moderationStatus === 'FLAGGED'
                      ? 'bg-warning/[0.12] text-warning'
                      : 'bg-fg-subtle/[0.12] text-fg-muted'
                }`}
              >
                {review.moderationStatus}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-fg-muted">
              <span>{review.authorName ?? 'Anonymous'}</span>
              <span className="text-fg-subtle">·</span>
              <RelativeTime value={review.createdAt} />
              <span className="text-fg-subtle">·</span>
              <span className="font-mono text-fg-subtle">order {review.orderId.slice(0, 8)}</span>
            </div>
          </div>
        )
      }
      footer={
        review && (
          <div className="flex w-full flex-wrap items-center gap-2">
            <Button
              variant={review.moderationStatus === 'PUBLISHED' ? 'ghost' : 'primary'}
              disabled={
                !canModerate || moderate.isPending || review.moderationStatus === 'PUBLISHED'
              }
              onClick={() => moderate.mutate({ id: review.id, status: 'PUBLISHED' })}
            >
              Publish
            </Button>
            <Button
              variant="ghost"
              disabled={!canModerate || moderate.isPending || review.moderationStatus === 'HIDDEN'}
              onClick={() => moderate.mutate({ id: review.id, status: 'HIDDEN' })}
            >
              Hide
            </Button>
            <Button
              variant="ghost"
              className="text-warning hover:text-warning"
              disabled={!canModerate || moderate.isPending || review.moderationStatus === 'FLAGGED'}
              onClick={() =>
                moderate.mutate({
                  id: review.id,
                  status: 'FLAGGED',
                  flagReason: flagReason.trim() || undefined,
                })
              }
            >
              Flag
            </Button>
            <Button
              variant="primary"
              className="ml-auto"
              disabled={!canModerate || replyMut.isPending || reply.trim().length === 0}
              onClick={() => replyMut.mutate({ id: review.id, reply: { reply: reply.trim() } })}
            >
              {review.ownerReply ? 'Update reply' : 'Send reply'}
            </Button>
          </div>
        )
      }
    >
      {review && (
        <div className="space-y-4">
          <section>
            <div className="mb-1 text-caption-admin text-fg-subtle">Comment</div>
            <div className="whitespace-pre-wrap rounded-md border-hairline bg-surface-2 p-3 text-sm text-fg">
              {review.comment ?? <span className="text-fg-subtle">(no comment)</span>}
            </div>
          </section>

          {review.images.length > 0 && (
            <section>
              <div className="mb-1 text-caption-admin text-fg-subtle">Photos</div>
              <div className="flex flex-wrap gap-2">
                {review.images.map((img) => (
                  <img
                    key={img.id}
                    src={img.url}
                    alt=""
                    className="h-20 w-20 rounded-md border-hairline object-cover"
                  />
                ))}
              </div>
            </section>
          )}

          <section>
            <div className="mb-1 text-caption-admin text-fg-subtle">Flag reason (optional)</div>
            <Textarea
              value={flagReason}
              onChange={(e) => setFlagReason(e.target.value)}
              placeholder="Spam, abusive language, off-topic, etc."
              rows={2}
              disabled={!canModerate}
            />
            {review.flagReason && (
              <div className="mt-1 text-xs text-warning">Current flag: {review.flagReason}</div>
            )}
          </section>

          <section>
            <div className="mb-1 text-caption-admin text-fg-subtle">Owner reply</div>
            <Textarea
              value={reply}
              onChange={(e) => setReply(e.target.value)}
              placeholder="Thank the customer or address their concern…"
              rows={4}
              disabled={!canModerate}
            />
            {review.ownerReplyAt && (
              <div className="mt-1 text-xs text-fg-subtle">
                Last replied <RelativeTime value={review.ownerReplyAt} />
              </div>
            )}
          </section>
        </div>
      )}
    </DetailDrawer>
  );
}
