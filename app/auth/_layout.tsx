import { Stack, Redirect } from 'expo-router';
import { useAuthStore } from '@/store/authStore';

export default function AuthLayout() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (isAuthenticated) return <Redirect href="/(app)" />;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#0F0F1A' } }}>
      <Stack.Screen name="login" />
    </Stack>
  );
}
