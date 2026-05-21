'use client';

import { Toaster as SonnerToaster } from 'sonner';

/**
 * Sonner toast container — warm-palette themed for the customer web app.
 *
 * Mount once at the app root (via AppProviders). Pages emit via the imperative
 * `toast()` API exported from `sonner` — e.g. `toast.success('Added to cart')`.
 *
 * Visual treatment:
 *  - Surface background, espresso text, copper accent for icons/links.
 *  - Top-right by default — matches the SD design for add-to-cart toasts.
 *  - 5s duration matches the spec's "5s timeout with Undo" pattern.
 */
export function Toaster() {
  return (
    <SonnerToaster
      position="top-right"
      duration={5000}
      closeButton
      richColors={false}
      toastOptions={{
        unstyled: false,
        className:
          'font-body text-sm shadow-md rounded-card border border-border/[var(--border-strong-alpha)]',
        style: {
          background: 'rgb(var(--surface-elevated))',
          color: 'rgb(var(--fg))',
        },
        classNames: {
          actionButton: 'bg-accent text-text-on-accent rounded-md px-2 py-1 text-xs font-medium',
          cancelButton: 'text-fg-muted text-xs',
          success: 'text-fg',
          error: 'text-negative',
        },
      }}
    />
  );
}
