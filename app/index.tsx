import { Redirect } from 'expo-router';
import { useSession } from '../src/store';

/** Auth gate: route to the app if a device-local session exists, else onboarding. */
export default function Index() {
  const session = useSession();
  return <Redirect href={session ? '/(tabs)/home' : '/(auth)/onboarding'} />;
}
