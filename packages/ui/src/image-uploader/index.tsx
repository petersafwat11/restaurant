'use client';

import { GripVertical, Image as ImageIcon, X } from 'lucide-react';
import * as React from 'react';
import { cn } from '../lib/cn';
import { DragReorderList } from '../drag-reorder-list';

export interface UploadedImage {
  id: string;
  url: string;
  alt?: string;
}

export interface ImageUploaderProps {
  images: UploadedImage[];
  /** Resolve when the upload completes and the parent state has been updated. */
  onAdd: (files: File[]) => Promise<void> | void;
  onRemove: (id: string) => void;
  /** Receives the reordered list — pass it back into state. */
  onReorder: (next: UploadedImage[]) => void;
  max?: number;
  /** width / height aspect for each tile, e.g. 4/3 for menu items. */
  aspect?: number;
  layout?: 'grid' | 'row';
  /** Override the default helper text. */
  helper?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * Drop-or-click uploader with drag-to-reorder thumbnails. Storage-agnostic
 * — the parent component supplies `onAdd(files)` which typically calls a
 * presign hook (`useImagePresign` → `PUT` to R2 → `POST` attach).
 *
 * Page-3 fix #3: replaces the bespoke per-section uploader in the Claude
 * Design source. Used by Menu items, Promotions banners, restaurant
 * logo/cover, and customer avatars — `aspect` + `layout` are the only knobs.
 */
export function ImageUploader({
  images,
  onAdd,
  onRemove,
  onReorder,
  max = 8,
  aspect = 4 / 3,
  layout = 'grid',
  helper,
  disabled,
  className,
}: ImageUploaderProps) {
  const [uploading, setUploading] = React.useState(false);
  const [over, setOver] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const canAddMore = !disabled && images.length < max;
  const helperText =
    helper ?? `Drop images here or click to upload — up to ${max}, JPG/PNG/WebP, max 5 MB`;

  async function handleFiles(filesList: FileList | null) {
    if (!filesList) return;
    const files = Array.from(filesList).slice(0, max - images.length);
    if (files.length === 0) return;
    setUploading(true);
    try {
      await onAdd(files);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      {canAddMore && (
        <div
          role="button"
          tabIndex={0}
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setOver(false);
            void handleFiles(e.dataTransfer.files);
          }}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          className={cn(
            'flex flex-col items-center justify-center gap-2 rounded-md border border-dashed px-4 py-6 text-center text-sm transition-colors',
            over
              ? 'border-accent bg-accent/[0.08] text-fg'
              : 'border-border/[var(--border-strong-alpha)] bg-surface text-fg-muted hover:border-accent/40 hover:text-fg',
            uploading && 'opacity-60',
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => void handleFiles(e.target.files)}
          />
          <ImageIcon size={18} className="text-fg-subtle" />
          <div className="text-xs">{uploading ? 'Uploading…' : helperText}</div>
        </div>
      )}

      {images.length > 0 && (
        <DragReorderList
          items={images}
          rowKey={(i) => i.id}
          orientation={layout === 'row' ? 'horizontal' : 'horizontal'}
          onReorder={onReorder}
          className={layout === 'grid' ? 'flex-wrap' : ''}
          renderItem={(img, { handle }) => (
            <div
              {...handle.attributes}
              {...handle.listeners}
              className={cn(
                'group relative overflow-hidden rounded-md border-hairline-strong bg-surface',
                handle.className,
              )}
              style={{ width: layout === 'grid' ? 120 : 160, aspectRatio: aspect }}
            >
              <img
                src={img.url}
                alt={img.alt ?? ''}
                draggable={false}
                loading="lazy"
                className="h-full w-full object-cover"
              />
              {images.indexOf(img) === 0 && (
                <span className="absolute left-1.5 top-1.5 rounded-sm bg-accent/90 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-bg">
                  Primary
                </span>
              )}
              <span className="absolute right-1.5 top-1.5 hidden rounded-sm bg-bg/60 p-1 text-fg-muted group-hover:flex">
                <GripVertical size={12} />
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(img.id);
                }}
                aria-label="Remove image"
                className="absolute bottom-1.5 right-1.5 hidden rounded-md bg-bg/80 p-1 text-fg-muted hover:bg-negative/30 hover:text-negative group-hover:flex"
              >
                <X size={12} />
              </button>
            </div>
          )}
        />
      )}
    </div>
  );
}
