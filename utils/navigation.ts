import { Linking, Platform, Alert } from 'react-native';

/**
 * Opens a navigation dialog (Apple Maps / Google Maps) using exact coordinates.
 * Uses lat,lng as the query so the map app pins the exact location
 * instead of searching by name (which can lead to wrong results).
 */
export function openNavigation(lat: number, lng: number, label: string) {
  // Apple Maps: q= for label, ll= + sll= for exact position, z= for zoom
  const encodedLabel = encodeURIComponent(label);
  const appleMapsUrl = `maps:0,0?q=${encodedLabel}&ll=${lat},${lng}&sll=${lat},${lng}&z=18`;

  // Google Maps: query=lat,lng pins the exact spot (no name-based search)
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

  if (Platform.OS === 'web') {
    window.open(googleMapsUrl, '_blank', 'noopener,noreferrer');
    return;
  }

  const options: { text: string; onPress: () => void }[] = [];

  if (Platform.OS === 'ios') {
    options.push({
      text: '🍎 Apple Maps',
      onPress: () => Linking.openURL(appleMapsUrl),
    });
  }

  options.push({
    text: '🗺️ Google Maps',
    onPress: () => Linking.openURL(googleMapsUrl),
  });

  Alert.alert('¿Cómo querés llegar?', label, [
    ...options,
    { text: 'Cancelar', onPress: () => {}, style: 'cancel' as const },
  ]);
}
