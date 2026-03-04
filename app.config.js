const { createAppConfig } = require('@eb-packages/expo-config');

module.exports = createAppConfig({
  name: 'zigzag',
  slug: 'zigzag',
  version: '1.0.0',
  projectId: '34a46d03-0540-481a-8326-ea123a330635',
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
    googleMapsApiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY,
  },
});
