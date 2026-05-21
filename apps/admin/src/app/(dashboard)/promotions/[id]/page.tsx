'use client';

import { PromotionsList } from '@/features/promotions/components';
import { useParams } from 'next/navigation';

export default function PromotionDetailPage() {
  const params = useParams<{ id: string }>();
  return <PromotionsList initialPromotionId={params.id} />;
}
