import { PublicTrackingApp } from '@/features/checkout/components/public-tracking-app';

/**
 * Public order tracking — `/orders/[orderId]?token=…`.
 *
 * Reached via the email confirmation link. The URL carries a signed HMAC
 * token; the backend verifies it before returning tracking info, so plain
 * `/orders/<id>` (no token) gets a 400 and renders the "link required" state.
 */
export default async function PublicOrderTrackingPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderId: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { orderId } = await params;
  const { token } = await searchParams;
  return <PublicTrackingApp orderId={orderId} token={token ?? null} />;
}
