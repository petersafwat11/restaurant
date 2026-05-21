import { redirect } from 'next/navigation';

// `/locations` was repurposed as the single-restaurant Restaurant Profile.
// Multi-location chains are out of scope for this platform's single-tenant
// data model; if/when that changes, this route becomes the per-location
// editor again. Keep as a 1-line redirect so any stale link still works.
export default function LocationsPage() {
  redirect('/restaurant');
}
