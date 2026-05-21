import { ConfirmationApp } from '@/features/checkout/components/confirmation-app';

/**
 * Checkout success / confirmation page — `/checkout/success/[orderId]`.
 *
 * Hydrates from `useOrder(orderId)`. The TanStack Query cache is pre-seeded
 * by `useCreateOrder` when the user arrives from `/checkout`, so the page
 * renders instantly without a skeleton flash. Deep-links from email trigger
 * a real fetch (small skeleton while loading).
 */
export default async function CheckoutSuccessPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  return <ConfirmationApp orderId={orderId} />;
}
