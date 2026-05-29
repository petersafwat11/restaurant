import type { Metadata } from 'next';
import type { ReactNode } from 'react';

// Checkout + checkout/success pages are per-user state and must never appear
// in SERPs. The parent (shop) layout also wraps /menu, which DOES need to be
// indexed — that's why the noindex lives here, scoped to the checkout subtree.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function CheckoutLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
