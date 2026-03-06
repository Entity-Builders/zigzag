import { supabase } from '@eb-packages/logic';

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
