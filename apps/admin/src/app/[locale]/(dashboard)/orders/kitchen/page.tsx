import { redirect } from '@/i18n/navigation';
import type { AppLocale } from '@/i18n/routing';

// KDS moved to its own no-shell route group at /kds. Keep this URL alive so
// any bookmarked / printed link still works.
export default async function KitchenPage({
  params,
}: {
  params: Promise<{ locale: AppLocale }>;
}) {
  const { locale } = await params;
  redirect({ href: '/kds', locale });
}
