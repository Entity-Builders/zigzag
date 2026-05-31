const { createAppConfig } = require('@eb-packages/expo-config');

module.exports = createAppConfig({
  name: 'zigzag',
  slug: 'zig-zag',
  version: '1.0.0',
  projectId: '34a46d03-0540-481a-8326-ea123a330635',
  scheme: 'zigzag',
  icon: './assets/icon.png',
  bundleIdentifier: {
    android: 'com.entitybuilders.zigzag',
  },
  plugins: ['expo-router'],
  ios: {
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        'Usamos tu ubicación para mostrar actividades cercanas a vos.',
    },
  },
  android: {
    permissions: ['ACCESS_COARSE_LOCATION', 'ACCESS_FINE_LOCATION'],
  },
  web: {
    bundler: 'metro',
  },
  extra: {
    EXPO_PUBLIC_APP_ENV: process.env.EXPO_PUBLIC_APP_ENV || process.env.APP_ENV,
    EXPO_PUBLIC_SUPABASE_URL: process.env.EXPO_PUBLIC_SUPABASE_URL,
    EXPO_PUBLIC_SUPABASE_ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
    EXPO_PUBLIC_SUPABASE_SCHEMA:
      process.env.EXPO_PUBLIC_SUPABASE_SCHEMA || 'zigzag',
    EXPO_PUBLIC_POSTHOG_KEY:
      process.env.EXPO_PUBLIC_POSTHOG_KEY ||
      process.env.EXPO_PUBLIC_ZIGZAG_POSTHOG_API_KEY,
    EXPO_PUBLIC_POSTHOG_HOST: process.env.EXPO_PUBLIC_POSTHOG_HOST,
    googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
  },
});
