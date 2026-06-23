'use client';

import { Check } from 'lucide-react';
import * as React from 'react';
import { cn } from '../lib/cn';

export interface NewsletterFormProps {
  placeholder?: string;
  ctaLabel?: string;
  /** Resolves on success, throws on error. */
  onSubmit: (email: string) => Promise<void>;
  successMessage?: string;
  errorMessage?: string;
  /** Accessible label for the email input. Falls back to English when absent. */
  emailAriaLabel?: string;
  /**
   * Marketing-consent label (with links). When provided, an unticked-by-default
   * consent checkbox is required before the form can be submitted (GDPR opt-in).
   */
  consentLabel?: React.ReactNode;
  /** Error shown when the consent box is required but unchecked. */
  consentRequiredMessage?: string;
  className?: string;
}

type State = 'idle' | 'loading' | 'success' | 'error';

export function NewsletterForm({
  placeholder = 'Your email',
  ctaLabel = 'Subscribe',
  onSubmit,
  successMessage = 'Welcome! Check your inbox for the code.',
  errorMessage = "Couldn't subscribe — try again.",
  emailAriaLabel = 'Email address',
  consentLabel,
  consentRequiredMessage = 'Please accept to receive the newsletter.',
  className,
}: NewsletterFormProps) {
  const [email, setEmail] = React.useState('');
  const [consent, setConsent] = React.useState(false);
  const [consentError, setConsentError] = React.useState(false);
  const [state, setState] = React.useState<State>('idle');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes('@')) {
      setState('error');
      return;
    }
    if (consentLabel && !consent) {
      setConsentError(true);
      return;
    }
    setConsentError(false);
    setState('loading');
    try {
      await onSubmit(email);
      setState('success');
    } catch {
      setState('error');
    }
  };

  if (state === 'success') {
    return (
      <div
        className={cn(
          'mx-auto flex max-w-[480px] items-center justify-center gap-3 rounded-button bg-accent/[0.10] px-5 py-4 text-fg',
          className,
        )}
      >
        <span className="grid h-7 w-7 place-items-center rounded-full bg-accent text-text-on-accent">
          <Check size={16} strokeWidth={2.6} />
        </span>
        <span className="text-body font-medium">{successMessage}</span>
      </div>
    );
  }

  return (
    <form
      noValidate
      onSubmit={handleSubmit}
      className={cn('mx-auto flex w-full max-w-[480px] flex-col gap-2', className)}
    >
      <div className="flex h-14 items-center overflow-hidden rounded-button border border-border/[var(--border-strong-alpha)] bg-surface-2 focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/30">
        <input
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (state === 'error') setState('idle');
          }}
          placeholder={placeholder}
          required
          aria-label={emailAriaLabel}
          className="flex-1 bg-transparent px-4 text-body text-fg outline-none placeholder:text-fg-subtle"
        />
        <button
          type="submit"
          disabled={state === 'loading'}
          className="m-1.5 inline-flex h-11 items-center rounded-button bg-accent px-5 text-[15px] font-medium text-text-on-accent transition-colors hover:bg-accent-hover disabled:opacity-60"
        >
          {state === 'loading' ? '…' : ctaLabel}
        </button>
      </div>
      {consentLabel && (
        // biome-ignore lint/a11y/noLabelWithoutControl: the checkbox is the control
        <label className="flex items-start gap-2 px-1 text-left text-small text-fg-muted">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => {
              setConsent(e.target.checked);
              if (e.target.checked) setConsentError(false);
            }}
            className="mt-0.5 h-4 w-4 shrink-0 rounded border-border/[var(--border-strong-alpha)] accent-accent"
          />
          <span>{consentLabel}</span>
        </label>
      )}
      {consentError && (
        <p role="alert" className="px-1 text-small text-negative">
          {consentRequiredMessage}
        </p>
      )}
      {state === 'error' && (
        <p role="alert" className="px-1 text-small text-negative">
          {errorMessage}
        </p>
      )}
    </form>
  );
}
