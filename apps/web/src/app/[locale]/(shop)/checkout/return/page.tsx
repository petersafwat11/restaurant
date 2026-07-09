import { CheckoutReturnApp } from '@/features/checkout/components/return-app';

/**
 * eService Hosted Payment Page return landing — `/checkout/return`. After the
 * customer pays on eService the browser is sent here; the client component reads
 * the eService return params and forwards to the confirmation page.
 */
export default function CheckoutReturnPage() {
  return <CheckoutReturnApp />;
}
