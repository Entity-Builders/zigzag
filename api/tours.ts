import { supabase } from '@eb-packages/logic';

export interface Tour {
  id: string;
  userId?: string | null;
  name: string;
  description?: string;
  coverImage?: string;
  duration?: number;
  price?: number;
  totalDistance?: number;
  totalDays?: number;
  categories?: string[];
  activities?: {
    activity?: {
      id: string;
      name: string;
      description?: string;
      type: string;
      photos?: any;
      latitude?: number;
      longitude?: number;
      address?: string;
      price?: number;
      duration?: number;
    };
    // Inline fields in case activity relation is missing
    activityName?: string;
    activityType?: string;
    activityLatitude?: number;
    activityLongitude?: number;
    activityData?: {
      description?: string;
      duration?: number;
      confidence?: string;
      source?: string;
      whyThisStop?: string;
      openingHours?: string;
      reservationStatus?: string;
      priceRange?: string;
      freshness?: string;
    };
    duration?: number;

    order: number;
    dayNumber?: number;
    travelTimeToNext?: number;
    distanceToNext?: number;
    transportMode?: string;
    actions?: string[];
    notes?: string;
  }[];
  metadata?: any;
  options?: {
    latitude?: number;
    longitude?: number;
    radius?: number;
    includeExistingActivities?: boolean;
  };
}

export interface GenerateTourDto {
  prompt?: string;
  destination?: string;
  destinationLatitude?: number;
  destinationLongitude?: number;
  latitude?: number;
  longitude?: number;
  radius?: number;
  includeExistingActivities?: boolean;
  days?: number;
  budgetLevel?: 'low' | 'medium' | 'high';
  interests?: string[];
  transportationMode?:
    | 'walking'
    | 'driving'
    | 'public_transport'
    | 'cycling'
    | ('walking' | 'driving' | 'public_transport' | 'cycling')[];
  groupType?: 'solo' | 'couple' | 'family' | 'friends';
  travelPace?: 'relaxed' | 'moderate' | 'fast';
  dietaryRestrictions?: string[];
  startDates?: string[];
  skipImageGeneration?: boolean;
  skipActivities?: boolean;
  excludeTours?: string[];
  categories?: string[];
  vibe?:
    | 'balancer'
    | 'nature_immersion'
    | 'social_explorer'
    | 'deep_focus'
    | 'random';
}

async function buildFunctionError(error: unknown): Promise<Error> {
  const context = (error as { context?: Response })?.context;
  let details: string | undefined;

  if (context) {
    try {
      const body = await context.clone().json();
      details = body?.error || body?.message || JSON.stringify(body);
    } catch {
      try {
        details = await context.clone().text();
      } catch {
        details = `${context.status} ${context.statusText}`;
      }
    }
  }

  const message =
    details && details !== '{}'
      ? details
      : error instanceof Error
        ? error.message
        : 'No se pudo generar el itinerario';

  return new Error(message);
}

export async function fetchNearbyTours(
  lat: number,
  lng: number,
  category: string = 'walking',
  radius: number = 1000,
) {
  // Using an RPC call or edge function for nearby search
  // In a direct DB query, it would be difficult to calculate Haversine locally without PostGIS
  // For now, we will just fetch all tours. A true implementation requires PostGIS and RPC
  const { data, error } = await supabase.from('tour').select('*');
  if (error) throw error;
  return data;
}

export async function fetchPublicTours(limit: number = 20) {
  const { data, error } = await supabase
    .from('tour')
    .select('*, activities:tour_activity(*)')
    .order('createdAt', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export async function fetchMyTours(userId: string) {
  const { data, error } = await supabase
    .from('tour')
    .select('*, activities:tour_activity(*)')
    .eq('userId', userId)
    .order('createdAt', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchTourById(id: string) {
  const { data, error } = await supabase
    .from('tour')
    .select('*, activities:tour_activity(*)')
    .eq('id', id)
    .single();
  if (error) throw error;
  return data;
}

export async function updateTourMetadata(id: string, metadata: any) {
  const { data, error } = await supabase
    .from('tour')
    .update({ metadata, updatedAt: new Date().toISOString() })
    .eq('id', id)
    .select('metadata')
    .single();
  if (error) throw error;
  return data?.metadata;
}

export async function generateTour(dataOrPrompt: string | GenerateTourDto) {
  const payload =
    typeof dataOrPrompt === 'string' ? { prompt: dataOrPrompt } : dataOrPrompt;

  const { data, error } = await supabase.functions.invoke(
    'zigzag-generate-tour',
    {
      body: payload,
    },
  );

  if (error) throw await buildFunctionError(error);
  if (data?.error) throw new Error(data.error);
  return data;
}
