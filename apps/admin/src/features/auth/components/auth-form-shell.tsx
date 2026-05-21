import * as React from 'react';

export interface AuthFormShellProps {
  title: React.ReactNode;
  helper?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
}

export function AuthFormShell({ title, helper, footer, children }: AuthFormShellProps) {
  return (
    <div className="w-full max-w-[420px] rounded-card border border-border/[var(--border-strong-alpha)] bg-surface-2 p-8 shadow-card">
      <div className="mb-6 space-y-1.5">
        <h1 className="text-h1-admin text-fg">{title}</h1>
        {helper && <p className="text-small-admin text-fg-muted">{helper}</p>}
      </div>
      {children}
      {footer && (
        <div className="mt-6 border-t border-border/[var(--border-alpha)] pt-4 text-center text-small-admin text-fg-muted">
          {footer}
        </div>
      )}
    </div>
  );
}
