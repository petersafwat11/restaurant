import { NewsletterAction } from '@/features/newsletter/newsletter-action';
import { setRequestLocale } from 'next-intl/server';
import { Suspense } from 'react';

export function generateStaticParams() {
  return [{ locale: 'pl' }, { locale: 'en' }];
}

export default async function NewsletterConfirmPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <Suspense>
      <NewsletterAction action="confirm" />
    </Suspense>
  );
}
