import { ConfirmationApp } from '@/features/checkout/components/confirmation-app';

/**
 * Account order-detail / tracking page — `/account/orders/[id]`.
 *
 * Reuses the ConfirmationApp component since the layout is identical:
 * SuccessHero (the user already confirmed; this is the receipt + tracking
 * view), ETA card, OrderProgressStepper, OrderSummaryPanel, details.
 *
 * Realtime status updates flow through @repo/realtime-client subscriptions
 * wired into the orders feature (use-realtime-status.ts).
 */
export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ConfirmationApp orderId={id} />;
}
