import { supabase } from '@entity-builders/logic';

export interface SuggestedActivity {
  id: string;
  title: string;
  description: string;
  emoji: string;
  estimatedDuration: number;
  priceLevel: number;
  timeRelevance: string;
  places: { id: string; name: string; lat: number; lng: number }[];
  tags: string[];
  setting?: 'indoor' | 'outdoor' | 'any';
  transportMode?: 'walk' | 'bike' | 'car' | 'transit';
}

export interface SuggestionsMeta {
  placesFound: number;
  generatedAt: string;
  cached: boolean;
  temporal: {
    momentOfDay: string;
    dayOfWeek: string;
    isWeekend: boolean;
  };
}

export interface SuggestionsResponse {
  activities: SuggestedActivity[];
  meta: SuggestionsMeta;
}

async function buildFunctionError(error: unknown): Promise<Error> {
  const context = (error as { context?: Response })?.context;
  let details: string | undefined;

  if (context) {
    try {
      const text = await context.clone().text();
      details = text || `${context.status} ${context.statusText}`;
    } catch {
      details = `${context.status} ${context.statusText}`;
    }
  }

  const message =
    details && details !== '{}'
      ? `Suggestions function failed: ${details}`
      : error instanceof Error
        ? error.message
        : 'Suggestions function failed';

  return new Error(message);
}

/**
 * Fetch AI-suggested activities for the user's current location and moment.
 * Calls the zigzag-suggest-activities edge function.
 */
export async function fetchSuggestedActivities(
  lat: number,
  lng: number,
  options?: {
    radius?: number;
    timezone?: string;
    count?: number;
    forceRefresh?: boolean;
    requestVibes?: string[];
    requestTransport?: string | null;
  },
): Promise<SuggestionsResponse> {
  const { data, error } = await supabase.functions.invoke(
    'zigzag-suggest-activities',
    {
      body: {
        lat,
        lng,
        radius: options?.radius ?? 2000,
        timezone: options?.timezone,
        count: options?.count ?? 6,
        forceRefresh: options?.forceRefresh ?? false,
        requestVibes: options?.requestVibes,
        requestTransport: options?.requestTransport,
      },
    },
  );

  if (error) throw await buildFunctionError(error);
  return data as SuggestionsResponse;
}
