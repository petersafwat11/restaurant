import { redirect } from 'next/navigation';

/**
 * /account → /account/profile. The sidebar nav's "Profile" link is the
 * canonical home of the account area.
 */
export default function AccountIndexPage() {
  redirect('/account/profile');
}
