export const paymentQueryKeys = {
  config: ['payments', 'config'] as const,
  byOrder: (orderId: string) => ['payments', 'by-order', orderId] as const,
};
