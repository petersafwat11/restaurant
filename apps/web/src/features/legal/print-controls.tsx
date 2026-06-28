'use client';

import { Button } from '@repo/ui';
import { Printer } from 'lucide-react';

/**
 * Printable / downloadable affordance for legal pages (plan §D1/§D2). Triggers
 * the browser's print dialog, from which the user can save the page as a PDF —
 * the standard, dependency-free "download a copy" path for a styled document.
 *
 * A small client island so the page body itself stays a server component (the
 * payment-provider crawler must still see all legal/contact facts in the
 * initial HTML). The durable PL/EN PDF attached to the order-confirmation email
 * is a separate, server-generated artifact (plan §C3, deferred) — this control
 * is only the on-page convenience copy.
 */
export function PrintControls({ label }: { label: string }) {
  return (
    <div className="mt-4 print:hidden">
      <Button type="button" variant="outline" size="sm" onClick={() => window.print()}>
        <Printer size={16} strokeWidth={1.5} aria-hidden />
        {label}
      </Button>
    </div>
  );
}
