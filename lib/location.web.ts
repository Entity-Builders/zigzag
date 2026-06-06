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
  _coords: Coordinates,
  fallback = 'Zona seleccionada',
): Promise<string> {
  return fallback;
}

export async function getInitialLocation(): Promise<RuntimeLocationResult> {
  const fallbackCoords = { lat: DEFAULT_CITY.lat, lng: DEFAULT_CITY.lng };

  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return {
      coords: null,
      fallbackCoords,
      label: DEFAULT_CITY.name,
      permission: 'unavailable',
    };
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        resolve({
          coords,
          fallbackCoords: coords,
          label: 'Ubicación del navegador',
          permission: 'granted',
        });
      },
      () =>
        resolve({
          coords: null,
          fallbackCoords,
          label: DEFAULT_CITY.name,
          permission: 'denied',
        }),
      {
        enableHighAccuracy: false,
        maximumAge: 1000 * 60 * 5,
        timeout: 8000,
      },
    );
  });
}
