import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { AuthProvider, useAuth } from '../contexts/AuthProvider';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { initAnalytics, analytics } from '../lib/analytics';
import { colors } from '../constants/theme';

// Initialize analytics as early as possible
// PostHogRNProvider auto-captures: uncaught exceptions, unhandled rejections
initAnalytics();

function RootNavigator() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthScreen = segments[0] === 'auth';

    if (session && inAuthScreen) {
      router.replace('/(tabs)');
    } else if (!session && !inAuthScreen) {
      router.replace('/auth');
    }

    // Identify user in PostHog when authenticated
    if (session?.user) {
      analytics.identify(session.user.id, { email: session.user.email });
    }
  }, [session, loading, segments]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size='large' color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      <StatusBar style='light' />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name='(tabs)' />
        <Stack.Screen name='auth' />
        <Stack.Screen name='generate' options={{ presentation: 'modal' }} />
        <Stack.Screen name='tour/[id]' />
        <Stack.Screen name='activity/[id]' />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});
