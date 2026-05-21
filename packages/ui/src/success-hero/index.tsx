import * as React from 'react';
import { cn } from '../lib/cn';

export interface SuccessHeroProps {
  /** Defaults to a copper hexagonal checkmark. */
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Optional meta block (e.g. order-number card). */
  meta?: React.ReactNode;
  className?: string;
}

function DefaultIcon() {
  return (
    <svg width={96} height={96} viewBox="0 0 64 64" aria-hidden>
      <defs>
        <linearGradient id="success-copper" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#D9551E" />
          <stop offset="50%" stopColor="#C2410C" />
          <stop offset="100%" stopColor="#9A330A" />
        </linearGradient>
      </defs>
      <polygon points="32,2 58,17 58,47 32,62 6,47 6,17" fill="url(#success-copper)" />
      <polygon
        points="32,7 53.5,19.5 53.5,44.5 32,57 10.5,44.5 10.5,19.5"
        fill="none"
        stroke="rgba(255,255,255,0.25)"
        strokeWidth={1}
      />
      <path
        d="M20 32 L29 41 L46 24"
        stroke="white"
        strokeWidth={4}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

export function SuccessHero({ icon, title, description, meta, className }: SuccessHeroProps) {
  return (
    <header className={cn('flex flex-col items-center gap-4 text-center', className)}>
      <div className="mb-2">{icon ?? <DefaultIcon />}</div>
      <h1
        tabIndex={-1}
        className="font-display text-h1 text-fg outline-none"
        style={{ textWrap: 'balance' as React.CSSProperties['textWrap'] }}
      >
        {title}
      </h1>
      {description && <p className="m-0 text-body-l text-fg-muted">{description}</p>}
      {meta && <div className="mt-4">{meta}</div>}
    </header>
  );
}
