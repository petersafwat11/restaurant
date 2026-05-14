export const promotionQueryKeys = {
  all: ['promotions'] as const,
  list: (active?: boolean) => ['promotions', 'list', { active }] as const,
  byId: (id: string) => ['promotions', id] as const,
  coupons: (promotionId: string) => ['promotions', promotionId, 'coupons'] as const,
};
