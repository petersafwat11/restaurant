'use client';

import { useUploadImage } from '@/features/uploads/hooks/use-upload-image';
import { notify } from '@/lib/notify';
import { MAX_REVIEW_IMAGES } from '@repo/types';
import {
  ActionModal,
  FormField,
  ImageUploader,
  StarRatingInput,
  type UploadedImage,
} from '@repo/ui';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import * as React from 'react';
import { useCreateReview } from '../hooks';

interface ReviewImage extends UploadedImage {
  /** Upload key sent to the API as part of `imageKeys`. */
  key: string;
}

export interface ReviewDialogProps {
  orderId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Modal for writing a review of a completed/delivered order. Rating is
 * required; comment and up to {@link MAX_REVIEW_IMAGES} photos are optional.
 * The backend re-validates eligibility (status + one-per-order), so a stale
 * "already reviewed" 400 is handled gracefully by closing + refreshing.
 */
export function ReviewDialog({ orderId, open, onOpenChange }: ReviewDialogProps) {
  const t = useTranslations('web.account.reviews');
  const qc = useQueryClient();
  const createReview = useCreateReview();
  const uploadImage = useUploadImage();

  const [rating, setRating] = React.useState(0);
  const [comment, setComment] = React.useState('');
  const [images, setImages] = React.useState<ReviewImage[]>([]);

  // Reset local state whenever the dialog (re)opens for an order.
  React.useEffect(() => {
    if (open) {
      setRating(0);
      setComment('');
      setImages([]);
    }
  }, [open]);

  async function handleAdd(files: File[]) {
    for (const file of files) {
      const res = await uploadImage.mutateAsync({ file, kind: 'review-image' }).catch(() => null);
      if (res) {
        setImages((prev) => [...prev, { id: res.key, key: res.key, url: res.publicUrl }]);
      }
    }
  }

  async function handleSubmit() {
    if (rating < 1) return;
    try {
      await createReview.mutateAsync({
        orderId,
        rating,
        comment: comment.trim() || undefined,
        imageKeys: images.length > 0 ? images.map((i) => i.key) : undefined,
      });
      notify('success', t('thanks'));
      onOpenChange(false);
    } catch (err) {
      // The mutation hook already surfaced the error toast. A 400 here means the
      // order is no longer reviewable (already reviewed / status changed) — drop
      // the stale CTA by refreshing and close.
      if (typeof err === 'object' && err && 'status' in err && err.status === 400) {
        qc.invalidateQueries({ queryKey: ['reviews'] });
        qc.invalidateQueries({ queryKey: ['orders'] });
        onOpenChange(false);
      }
    }
  }

  return (
    <ActionModal
      open={open}
      onOpenChange={onOpenChange}
      title={t('modal.title')}
      description={t('modal.description')}
      primary={{
        label: t('submit'),
        onClick: () => void handleSubmit(),
        loading: createReview.isPending,
        disabled: rating < 1,
      }}
      secondary={{ label: t('modal.cancel'), onClick: () => onOpenChange(false) }}
    >
      <div className="flex flex-col gap-5">
        <FormField id="review-rating" label={t('rating')} required>
          <div className="pt-1">
            <StarRatingInput
              value={rating}
              onChange={setRating}
              ariaLabel={t('rating')}
              starLabel={(v) => t('modal.starLabel', { count: v })}
            />
          </div>
        </FormField>

        <FormField id="review-comment" label={t('comment')} helper={t('modal.commentHelper')}>
          <textarea
            id="review-comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
            maxLength={2000}
            placeholder={t('modal.commentPlaceholder')}
            className="w-full resize-none rounded-input border border-border/[var(--border-strong-alpha)] bg-surface-2 px-4 py-3 text-body text-fg outline-none focus:border-accent focus:ring-2 focus:ring-accent/30"
          />
        </FormField>

        <FormField
          id="review-photos"
          label={t('modal.photosLabel')}
          helper={t('modal.photosHelper')}
        >
          <ImageUploader
            images={images.map(({ id, url }) => ({ id, url }))}
            onAdd={handleAdd}
            onRemove={(id) => setImages((prev) => prev.filter((i) => i.id !== id))}
            onReorder={(next) =>
              setImages((prev) =>
                next
                  .map((n) => prev.find((i) => i.id === n.id))
                  .filter((i): i is ReviewImage => Boolean(i)),
              )
            }
            max={MAX_REVIEW_IMAGES}
            aspect={1}
            uploadingLabel={t('modal.uploading')}
            renderHelp={({ max }) => t('modal.photosDropzone', { max })}
          />
        </FormField>
      </div>
    </ActionModal>
  );
}
