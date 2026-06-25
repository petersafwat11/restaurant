import { redirect } from '@/i18n/navigation';

/**
 * /account → /account/profile. The sidebar nav's "Profile" link is the
 * canonical home of the account area.
 *
 * Uses next-intl's locale-aware `redirect` (not `next/navigation`'s) so the
 * active locale is preserved — otherwise a user who registers/logs in on the
 * English site would be bounced to the default Polish locale here.
 */
export default async function AccountIndexPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  redirect({ href: '/account/profile', locale });
}
