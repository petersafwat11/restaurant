import { useAuthStore } from '@/stores/auth-store';
import { Tabs } from 'expo-router';
import { router } from 'expo-router';
import { useEffect } from 'react';

// Auth guard: redirect to login if no session after hydration.
export default function TabsLayout() {
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (isHydrated && !user) {
      router.replace('/(auth)/login');
    }
  }, [isHydrated, user]);

  // TODO(ui): real tab bar in UI sprint
  return <Tabs screenOptions={{ headerShown: false }} />;
}
