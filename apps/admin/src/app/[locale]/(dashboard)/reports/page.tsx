import { redirect } from '@/i18n/navigation';
import type { AppLocale } from '@/i18n/routing';

interface PageProps {
  params: Promise<{ locale: AppLocale }>;
}

export default async function ReportsLanding({ params }: PageProps) {
  const { locale } = await params;
  redirect({ href: '/reports/exports', locale });
}
