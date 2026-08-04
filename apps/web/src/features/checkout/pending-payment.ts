export const PENDING_PAYMENT_KEY = 'checkout:pending';

export type PendingPayment = {
  orderId: string;
  token: string | null;
};

export function parsePendingPayment(raw: string | null): PendingPayment | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as { orderId?: unknown; token?: unknown };
    if (typeof value.orderId !== 'string' || value.orderId.length === 0) return null;
    if (value.token !== null && value.token !== undefined && typeof value.token !== 'string') {
      return null;
    }
    return { orderId: value.orderId, token: value.token ?? null };
  } catch {
    return null;
  }
}

/** A remembered order can disappear, become inaccessible, or already be paid. */
export function isMissingPendingOrderError(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false;
  const error = value as { status?: unknown; code?: unknown; message?: unknown };
  return (
    error.status === 404 ||
    error.status === 403 ||
    error.code === 'NOT_FOUND' ||
    error.code === 'FORBIDDEN' ||
    error.message === 'Order not found' ||
    error.message === 'Not your order' ||
    error.message === 'Order is already paid' ||
    error.message === 'Order payment is already paid'
  );
}
