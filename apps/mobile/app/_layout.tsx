import { AppProviders } from '@/providers/app-providers';
import { Stack } from 'expo-router';

// TODO(ui): theme + safe-area in design-system sprint
export default function RootLayout() {
  return (
    <AppProviders>
      <Stack screenOptions={{ headerShown: false }} />
    </AppProviders>
  );
}
