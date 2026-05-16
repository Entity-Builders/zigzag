import { Analytics } from '@eb-packages/analytics';
import { PostHogRNProvider } from '@eb-packages/analytics/src/posthog-rn-provider';

/**
 * Singleton analytics instance for ZigZag.
 * Uses @eb-packages/analytics (shared across Entity Builders apps).
 *
 * PostHogRNProvider auto-captures:
 * - Uncaught JS exceptions
 * - Unhandled promise rejections
 * - console.error / console.warn calls
 *
 * Usage:
 *   import { analytics } from '../lib/analytics';
 *   analytics.track('engine_run', { activities: 5 });
 *   analytics.captureError(error, { screen: 'HomeScreen' });
 */
export const posthogRNProvider = new PostHogRNProvider();
export const analytics = new Analytics(posthogRNProvider);

/** Returns the raw PostHog client — for PostHogProvider wrapper if needed */
export const getPostHogClient = () => posthogRNProvider.getClient();

export function initAnalytics(): void {
  analytics.init({
    apiKey: process.env.EXPO_PUBLIC_POSTHOG_KEY ?? '',
    apiHost: process.env.EXPO_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
    disabled: !process.env.EXPO_PUBLIC_POSTHOG_KEY,
  });

  analytics.setGlobalProperties({
    app: 'zigzag',
    platform: 'ios',
    environment: process.env.EXPO_PUBLIC_POSTHOG_KEY
      ? 'production'
      : 'development',
  });
}

// ─── ZigZag-specific event helpers ─────────────────────────────
export const trackActivityGenerated = (count: number) =>
  analytics.track('activity_generated', { count });

export const trackPlaceDiscovered = (placeId: string, source: string) =>
  analytics.track('place_discovered', { place_id: placeId, source });

export const trackEngineRun = (
  activitiesCreated: number,
  placesDiscovered: number,
) =>
  analytics.track('engine_run', {
    activities_created: activitiesCreated,
    places_discovered: placesDiscovered,
  });

export const trackLocationUpdated = (lat: number, lng: number) =>
  analytics.track('location_updated', { lat, lng });
