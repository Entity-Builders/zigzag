import { supabase } from '@entity-builders/logic';

export interface Place {
  id: string;
  name: string;
  type: string;
  description?: string;
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  photos?: any[];
  metadata?: any;
  distance_meters?: number;
}

export async function fetchNearbyPlaces(
  lat: number,
  lng: number,
  radiusMeters: number = 2000,
): Promise<Place[]> {
  const { data, error } = await supabase.rpc('find_nearby_places', {
    lat,
    lng,
    radius_meters: radiusMeters,
  });
  if (error) throw error;
  return data ?? [];
}

export async function fetchPlaceById(id: string): Promise<Place> {
  const { data, error } = await supabase
    .from('place')
    .select('*')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export interface DiscoveryResult {
  places: Place[];
  cached: boolean;
  discovered?: number;
  scanned_at?: string;
}

/**
 * Discover places on-demand via edge function.
 * If the zone was already scanned, returns cached results.
 * Otherwise, queries Overpass API server-side and caches the results.
 */
export async function discoverPlaces(
  lat: number,
  lng: number,
  radiusMeters: number = 2000,
  forceRescan: boolean = false,
): Promise<DiscoveryResult> {
  const { data, error } = await supabase.functions.invoke(
    'zigzag-discover-places',
    {
      body: { lat, lng, radius_meters: radiusMeters, forceRescan },
    },
  );
  if (error) throw error;
  return data as DiscoveryResult;
}
