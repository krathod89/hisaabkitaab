import { View } from 'react-native';
import { Redirect } from 'expo-router';
import { color } from '../src/theme';
import { useAuth } from '../src/auth/AuthProvider';

/** Auth gate: wait for auth to initialize, then route to the app or onboarding. */
export default function Index() {
  const { user, initializing } = useAuth();
  if (initializing) {
    return <View style={{ flex: 1, backgroundColor: color.bg }} />;
  }
  return <Redirect href={user ? '/(tabs)/home' : '/(auth)/onboarding'} />;
}
