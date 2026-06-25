import { CheckoutReturnApp } from '@/features/checkout/components/return-app';

/**
 * Stripe redirect landing — `/checkout/return`. Redirect payment methods (BLIK,
 * P24) send the browser here after confirmation; the client component reads the
 * Stripe status params and forwards to the confirmation page.
 */
export default function CheckoutReturnPage() {
  return <CheckoutReturnApp />;
}
