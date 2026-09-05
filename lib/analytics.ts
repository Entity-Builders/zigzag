import { Analytics, PostHogProvider } from '@entity-builders/analytics';

/**
 * Singleton analytics instance for ZigZag.
 * Uses @entity-builders/analytics (shared across Entity Builders apps).
 *
 * Usage:
 *   import { analytics } from '../lib/analytics';
 *   analytics.track('engine_run', { activities: 5 });
 *   analytics.captureError(error, { screen: 'HomeScreen' });
 */
export const posthogProvider = new PostHogProvider();
export const analytics = new Analytics(posthogProvider);

/** Returns the raw PostHog client — for PostHogProvider wrapper if needed */
export const getPostHogClient = () => undefined;

export function initAnalytics(): void {
  const posthogKey =
    process.env.EXPO_PUBLIC_POSTHOG_KEY ||
    process.env.EXPO_PUBLIC_ZIGZAG_POSTHOG_API_KEY ||
    '';

  analytics.init({
    apiKey: posthogKey,
    apiHost: process.env.EXPO_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
    disabled: !posthogKey,
  });

  analytics.setGlobalProperties({
    app: 'zigzag',
    platform: 'web',
    environment: posthogKey ? 'production' : 'development',
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

export const trackCityDayGenerated = (
  tourId: string,
  properties: Record<string, unknown> = {},
) => analytics.track('city_day_generated', { tour_id: tourId, ...properties });

export const trackCityDayViewed = (
  tourId: string,
  properties: Record<string, unknown> = {},
) => analytics.track('city_day_viewed', { tour_id: tourId, ...properties });

export const trackCityDayAdjusted = (
  tourId: string,
  action: string,
  properties: Record<string, unknown> = {},
) =>
  analytics.track('city_day_adjusted', {
    tour_id: tourId,
    action,
    ...properties,
  });

export const trackCityDaySaved = (
  tourId: string,
  properties: Record<string, unknown> = {},
) => analytics.track('city_day_saved', { tour_id: tourId, ...properties });

export const trackCityDayReopened = (
  tourId: string,
  properties: Record<string, unknown> = {},
) => analytics.track('city_day_reopened', { tour_id: tourId, ...properties });

export const trackCityDayShared = (
  tourId: string,
  properties: Record<string, unknown> = {},
) => analytics.track('city_day_shared', { tour_id: tourId, ...properties });

export const trackPremiumInterestClicked = (
  surface: string,
  properties: Record<string, unknown> = {},
) =>
  analytics.track('premium_interest_clicked', {
    surface,
    ...properties,
  });
