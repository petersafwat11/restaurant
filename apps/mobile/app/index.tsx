import { Redirect } from 'expo-router';

// Boot route — auth guard redirects to (tabs) or (auth)/login.
export default function Index() {
  return <Redirect href="/(tabs)" />;
}
