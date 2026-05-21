import * as React from 'react';
import { cn } from '../lib/cn';

export type SpinnerSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';
export type SpinnerTone = 'accent' | 'fg' | 'muted' | 'invert' | 'current';

export interface SpinnerProps {
  size?: SpinnerSize;
  tone?: SpinnerTone;
  /** Accessible label. Visually hidden by default — set `labelPosition="below"` to show under the arc. */
  label?: string;
  labelPosition?: 'sr-only' | 'below';
  className?: string;
}

const SIZE_PX: Record<SpinnerSize, number> = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 28,
  xl: 40,
};

const STROKE_PX: Record<SpinnerSize, number> = {
  xs: 1.5,
  sm: 1.75,
  md: 2,
  lg: 2.25,
  xl: 2.5,
};

const TONE_CLASS: Record<SpinnerTone, string> = {
  accent: 'text-accent',
  fg: 'text-fg',
  muted: 'text-fg-muted',
  invert: 'text-white',
  /** Inherits color from parent — useful inside buttons whose text color varies. */
  current: '',
};

/**
 * Themed circular spinner. A 270° arc rotates over a faint full-circle track.
 *
 * Themed via `currentColor` + the app's CSS variables: web renders copper on
 * cream, admin renders mint on dark slate, no per-app code required.
 */
export function Spinner({
  size = 'md',
  tone = 'accent',
  label,
  labelPosition = 'sr-only',
  className,
}: SpinnerProps) {
  const px = SIZE_PX[size];
  const stroke = STROKE_PX[size];
  const radius = (px - stroke) / 2;
  const cx = px / 2;
  const circumference = 2 * Math.PI * radius;
  // Show 75% of the circle as the active arc.
  const dash = circumference * 0.75;
  const gap = circumference - dash;

  return (
    <span
      role="status"
      aria-live="polite"
      className={cn(
        'inline-flex items-center gap-2',
        labelPosition === 'below' && 'flex-col',
        className,
      )}
    >
      <svg
        width={px}
        height={px}
        viewBox={`0 0 ${px} ${px}`}
        aria-hidden="true"
        className={cn('animate-spin', TONE_CLASS[tone])}
        style={{ animationDuration: '900ms' }}
      >
        {/* Track */}
        <circle
          cx={cx}
          cy={cx}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          opacity={0.18}
        />
        {/* Arc */}
        <circle
          cx={cx}
          cy={cx}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${gap}`}
          strokeDashoffset={0}
        />
      </svg>
      {label ? (
        <span
          className={cn(
            labelPosition === 'sr-only'
              ? 'sr-only'
              : 'text-small font-medium text-fg-muted',
          )}
        >
          {label}
        </span>
      ) : (
        <span className="sr-only">Loading</span>
      )}
    </span>
  );
}

export interface PageSpinnerProps {
  /** Optional caption rendered beneath the spinner. */
  label?: string;
  /** Override the default min-height. Defaults to `min-h-[60vh]`. */
  minHeightClassName?: string;
  /** Spinner size — defaults to `xl`. */
  size?: SpinnerSize;
  /** Spinner tone — defaults to `accent`. */
  tone?: SpinnerTone;
  className?: string;
}

/**
 * Full-page centered loading state. Use inside route components when a
 * skeleton would be heavier than the wait time itself.
 */
export function PageSpinner({
  label,
  minHeightClassName = 'min-h-[60vh]',
  size = 'xl',
  tone = 'accent',
  className,
}: PageSpinnerProps) {
  return (
    <div
      className={cn(
        'flex w-full flex-col items-center justify-center gap-4 px-6 py-16',
        minHeightClassName,
        className,
      )}
    >
      <Spinner size={size} tone={tone} />
      {label && <p className="text-body text-fg-muted">{label}</p>}
    </div>
  );
}
