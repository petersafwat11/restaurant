'use client';

import { RequirePermission } from '@/features/auth/components';
import { CustomersList } from '@/features/customers/components';

export default function CustomersPage() {
  return (
    <RequirePermission perm="customer:read">
      <CustomersList />
    </RequirePermission>
  );
}
