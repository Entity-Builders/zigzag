/**
 * ZigZag Vibes — Experience filter taxonomy
 *
 * Each vibe maps to one or more activity tags.
 * Filtering is client-side: activity matches if ANY of its tags
 * intersects with ANY active vibe's matchTags.
 */

export interface Vibe {
  key: string;
  emoji: string;
  label: string;
  matchTags: string[];
}

export const VIBES: Vibe[] = [
  {
    key: 'foodie',
    emoji: '🍕',
    label: 'Foodie',
    matchTags: ['food', 'foodie'],
  },
  {
    key: 'adventure',
    emoji: '🚴',
    label: 'Aventura',
    matchTags: ['adventure', 'active', 'outdoor'],
  },
  {
    key: 'romantic',
    emoji: '💑',
    label: 'Romántico',
    matchTags: ['romantic', 'relax'],
  },
  {
    key: 'history',
    emoji: '🏛️',
    label: 'Historia',
    matchTags: ['history', 'culture'],
  },
  {
    key: 'culture',
    emoji: '🎭',
    label: 'Cultural',
    matchTags: ['culture'],
  },
  {
    key: 'relax',
    emoji: '🧘',
    label: 'Relax',
    matchTags: ['relax'],
  },
  {
    key: 'friends',
    emoji: '👥',
    label: 'Con amigos',
    matchTags: ['social', 'friends', 'nightlife'],
  },
  {
    key: 'express',
    emoji: '⚡',
    label: 'Plan express',
    matchTags: ['quick', 'express'],
  },
  {
    key: 'nightlife',
    emoji: '🌙',
    label: 'Nocturno',
    matchTags: ['nightlife'],
  },
  {
    key: 'biking',
    emoji: '🚲',
    label: 'En bici',
    matchTags: ['biking', 'outdoor'],
  },
];

export interface TransportOption {
  key: string;
  emoji: string;
  label: string;
}

export const TRANSPORT_OPTIONS: TransportOption[] = [
  { key: 'walk', emoji: '🚶', label: 'A pie' },
  { key: 'bike', emoji: '🚲', label: 'Bici' },
  { key: 'car', emoji: '🚗', label: 'Auto' },
  { key: 'transit', emoji: '🚌', label: 'Transporte' },
];

/**
 * Returns true if the activity matches the active filters.
 * - If no vibes are active AND no transport filter → matches all
 * - Vibes use OR logic (matches if ANY vibe's tags intersect)
 * - Transport is exact match
 */
export function matchesFilters(
  activityTags: string[],
  activityTransport: string | undefined,
  activeVibes: string[],
  transportFilter: string | null,
): boolean {
  // No filters → everything passes
  if (activeVibes.length === 0 && !transportFilter) return true;

  // Check transport first (strict)
  if (transportFilter && activityTransport !== transportFilter) return false;

  // Check vibes (AND logic)
  if (activeVibes.length > 0) {
    // Every active vibe must be satisfied by the activity's tags
    const allVibesMatch = activeVibes.every((activeKey) => {
      const vibe = VIBES.find((v) => v.key === activeKey);
      if (!vibe) return true; // Safety check
      // Activity must have at least one tag matching this specific vibe
      return activityTags.some((tag) => vibe.matchTags.includes(tag));
    });

    if (!allVibesMatch) return false;
  }

  return true;
}

// ─── Trigger OTA Update ───
