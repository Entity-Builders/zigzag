import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { ActivityIndicator, View, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
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
  const isAuthenticated = Boolean(session);

  useEffect(() => {
    if (loading) return;

    const inAuthScreen = segments[0] === 'auth';

    if (isAuthenticated && inAuthScreen) {
      router.replace('/(tabs)');
    } else if (!isAuthenticated && !inAuthScreen) {
      router.replace('/auth');
    }

    // Identify user in PostHog when authenticated
    if (session?.user) {
      analytics.identify(session.user.id, { email: session.user.email });
    }
  }, [isAuthenticated, session, loading, segments, router]);

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
      <Stack
        initialRouteName={isAuthenticated ? '(tabs)' : 'auth'}
        screenOptions={{ headerShown: false }}
      >
        {!isAuthenticated ? (
          <Stack.Screen name='auth' />
        ) : [
          <Stack.Screen key='tabs' name='(tabs)' />,
          <Stack.Screen
            key='generate'
            name='generate'
            options={{ presentation: 'modal' }}
          />,
          <Stack.Screen key='tour' name='tour/[id]' />,
          <Stack.Screen key='activity' name='activity/[id]' />,
        ]}
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
      </SafeAreaProvider>
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
