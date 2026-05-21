import { redirect } from '@/i18n/navigation';
import type { AppLocale } from '@/i18n/routing';

export default async function LocationEditPage({
  params,
}: {
  params: Promise<{ locale: AppLocale }>;
}) {
  const { locale } = await params;
  redirect({ href: '/restaurant', locale });
}
