import * as Location from 'expo-location';

export type Coordinates = {
  lat: number;
  lng: number;
};

export type RuntimeLocationResult = {
  coords: Coordinates | null;
  fallbackCoords: Coordinates;
  label: string;
  permission: 'granted' | 'denied' | 'unavailable';
};

export const DEFAULT_CITY = {
  name: 'Buenos Aires',
  lat: -34.6037,
  lng: -58.3816,
};

export async function reverseGeocodeLabel(
  coords: Coordinates,
  fallback = 'Tu ubicación',
): Promise<string> {
  try {
    const [geo] = await Location.reverseGeocodeAsync({
      latitude: coords.lat,
      longitude: coords.lng,
    });

    return (
      [geo?.district || geo?.subregion, geo?.city].filter(Boolean).join(', ') ||
      fallback
    );
  } catch {
    return fallback;
  }
}

export async function getInitialLocation(): Promise<RuntimeLocationResult> {
  const { status } = await Location.requestForegroundPermissionsAsync();

  if (status !== 'granted') {
    return {
      coords: null,
      fallbackCoords: { lat: DEFAULT_CITY.lat, lng: DEFAULT_CITY.lng },
      label: 'Elegí una zona en el mapa',
      permission: 'denied',
    };
  }

  try {
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    const coords = {
      lat: location.coords.latitude,
      lng: location.coords.longitude,
    };

    return {
      coords,
      fallbackCoords: coords,
      label: await reverseGeocodeLabel(coords),
      permission: 'granted',
    };
  } catch {
    return {
      coords: null,
      fallbackCoords: { lat: DEFAULT_CITY.lat, lng: DEFAULT_CITY.lng },
      label: DEFAULT_CITY.name,
      permission: 'unavailable',
    };
  }
}
