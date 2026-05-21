'use client';

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../_shadcn/dialog';
import { Button, type ButtonProps } from '../_shadcn/button';
import { cn } from '../lib/cn';

export interface ActionModalButton {
  label: React.ReactNode;
  onClick: () => void;
  variant?: ButtonProps['variant'];
  disabled?: boolean;
  loading?: boolean;
  type?: 'button' | 'submit';
}

export interface ActionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** Body slot — typically a form (refund amount, cancel reason, etc.). */
  children?: React.ReactNode;
  /** Optional helper text shown left-aligned in the footer next to buttons. */
  footerHelper?: React.ReactNode;
  primary?: ActionModalButton;
  secondary?: ActionModalButton;
  /** Apply destructive intent to the title + primary button. */
  variant?: 'default' | 'destructive';
  /** Override the default max-w-lg from DialogContent. */
  width?: number;
}

/**
 * Confirmation / form modal. Wraps shadcn `Dialog` with a fixed
 * title/body/footer layout. Primary actions can show a loading spinner via
 * `primary.loading` (button gets disabled + a small loader). Use for
 * Refund, Cancel, Bulk-status-change, Delete, Invite Staff, Create Export.
 */
export function ActionModal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footerHelper,
  primary,
  secondary,
  variant = 'default',
  width,
}: ActionModalProps) {
  const primaryVariant: ButtonProps['variant'] =
    primary?.variant ?? (variant === 'destructive' ? 'destructive' : 'primary');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(width && 'max-w-none')}
        style={width ? { width } : undefined}
      >
        <DialogHeader>
          <DialogTitle
            className={cn(variant === 'destructive' && 'text-negative')}
          >
            {title}
          </DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        {children && <div className="text-sm text-fg">{children}</div>}
        <DialogFooter>
          {footerHelper && (
            <span className="mr-auto text-xs text-fg-subtle">{footerHelper}</span>
          )}
          {secondary && (
            <Button
              type={secondary.type ?? 'button'}
              variant={secondary.variant ?? 'ghost'}
              disabled={secondary.disabled || secondary.loading}
              onClick={secondary.onClick}
            >
              {secondary.label}
            </Button>
          )}
          {primary && (
            <Button
              type={primary.type ?? 'button'}
              variant={primaryVariant}
              disabled={primary.disabled || primary.loading}
              onClick={primary.onClick}
            >
              {primary.loading ? '…' : primary.label}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
