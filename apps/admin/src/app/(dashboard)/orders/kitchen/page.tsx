import { redirect } from 'next/navigation';

// KDS moved to its own no-shell route group at /kds. Keep this URL alive so
// any bookmarked / printed link still works.
export default function KitchenPage() {
  redirect('/kds');
}
