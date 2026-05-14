export const paymentQueryKeys = {
  byOrder: (orderId: string) => ['payments', 'by-order', orderId] as const,
};
