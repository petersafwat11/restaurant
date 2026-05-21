'use client';

import { CustomersList } from '@/features/customers/components';
import { useParams } from 'next/navigation';

export default function CustomerDetailPage() {
  const params = useParams<{ id: string }>();
  return <CustomersList initialCustomerId={params.id} />;
}
