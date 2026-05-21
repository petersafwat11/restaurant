'use client';

import { RequirePermission } from '@/features/auth/components';
import { PromotionsList } from '@/features/promotions/components';

export default function PromotionsPage() {
  return (
    <RequirePermission perm="promotion:read">
      <PromotionsList />
    </RequirePermission>
  );
}
