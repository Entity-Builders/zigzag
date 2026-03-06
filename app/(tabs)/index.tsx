import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { colors, typography, spacing, radii } from '../../constants/theme';
import {
  fetchNearbyPlaces,
  discoverPlaces,
  type Place,
} from '../../api/places';

const MIN_PLACES_THRESHOLD = 3;

const PLACE_ICONS: Record<string, string> = {
  park: '🌳',
  museum: '🏛️',
  restaurant: '🍽️',
  cafe: '☕',
  bar: '🍸',
  landmark: '📍',
  bus_stop: '🚌',
  subway_station: '🚇',
  train_station: '🚂',
  market: '🛒',
  theater: '🎭',
  gallery: '🎨',
  viewpoint: '👀',
  point_of_interest: '⭐',
};

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

function PlaceCard({ place }: { place: Place }) {
  const icon = PLACE_ICONS[place.type] ?? '📌';

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.7}>
      <View style={styles.cardIcon}>
        <Text style={styles.cardEmoji}>{icon}</Text>
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.cardName} numberOfLines={1}>
          {place.name}
        </Text>
        <View style={styles.cardMeta}>
          <Text style={styles.cardType}>{place.type.replace(/_/g, ' ')}</Text>
          {place.distance_meters != null && (
            <Text style={styles.cardDistance}>
              {formatDistance(place.distance_meters)}
            </Text>
          )}
        </View>
        {place.address && (
          <Text style={styles.cardAddress} numberOfLines={1}>
            {place.address}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

function DiscoveringBanner({ discovered }: { discovered?: number }) {
  return (
    <View style={styles.discoverBanner}>
      <View style={styles.discoverDot}>
        <ActivityIndicator size='small' color={colors.primary} />
      </View>
      <View style={styles.discoverContent}>
        <Text style={styles.discoverTitle}>Descubriendo tu zona...</Text>
        <Text style={styles.discoverText}>
          {discovered
            ? `${discovered} lugares encontrados`
            : 'Buscando lugares cercanos en OpenStreetMap'}
        </Text>
      </View>
    </View>
  );
}

function DiscoveryComplete({ count }: { count: number }) {
  return (
    <View style={styles.discoveryComplete}>
      <Text style={styles.discoveryCompleteIcon}>✨</Text>
      <Text style={styles.discoveryCompleteText}>
        {count} lugares descubiertos en tu zona
      </Text>
    </View>
  );
}

export default function ExplorarScreen() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [discoveredCount, setDiscoveredCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [locationName, setLocationName] = useState('Buscando...');
  const router = useRouter();

  const loadNearby = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);
      setDiscoveredCount(null);

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Permiso de ubicación denegado');
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = location.coords;

      // Reverse geocode for location name
      try {
        const [geo] = await Location.reverseGeocodeAsync({
          latitude,
          longitude,
        });
        if (geo) {
          setLocationName(
            geo.district || geo.subregion || geo.city || 'Tu ubicación',
          );
        }
      } catch {
        setLocationName('Tu ubicación');
      }

      // Step 1: Try cached places first
      const cached = await fetchNearbyPlaces(latitude, longitude, 5000);

      if (cached.length >= MIN_PLACES_THRESHOLD) {
        // Enough cached places — show them
        setPlaces(cached);
      } else {
        // Not enough — trigger on-demand discovery
        setPlaces(cached); // show what we have
        setLoading(false);
        setDiscovering(true);

        try {
          const result = await discoverPlaces(latitude, longitude, 3000);
          setPlaces(result.places);
          if (!result.cached && result.discovered) {
            setDiscoveredCount(result.discovered);
            // Clear the "discovered" badge after 4 seconds
            setTimeout(() => setDiscoveredCount(null), 4000);
          }
        } catch (discoverErr: any) {
          console.warn('Discovery failed:', discoverErr.message);
          // Keep showing whatever cached places we had
        } finally {
          setDiscovering(false);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Error cargando lugares');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadNearby();
  }, [loadNearby]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Explorar</Text>
        <Text style={styles.subtitle}>
          📍 {locationName} · {places.length} lugares cerca
        </Text>
      </View>

      {/* Discovery UX */}
      {discovering && <DiscoveringBanner />}
      {discoveredCount && <DiscoveryComplete count={discoveredCount} />}

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size='large' color={colors.primary} />
          <Text style={styles.loadingText}>Buscando lugares cercanos...</Text>
        </View>
      ) : error ? (
        <View style={styles.centered}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => loadNearby()}
          >
            <Text style={styles.retryText}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      ) : places.length === 0 && !discovering ? (
        <View style={styles.centered}>
          <Text style={styles.emptyIcon}>🗺️</Text>
          <Text style={styles.emptyText}>
            No se encontraron lugares en tu zona
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => loadNearby()}
          >
            <Text style={styles.retryText}>Buscar de nuevo</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={places}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <PlaceCard place={item} />}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadNearby(true)}
              tintColor={colors.primary}
            />
          }
        />
      )}

      {/* Floating Generate Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/generate')}
        activeOpacity={0.85}
      >
        <Text style={styles.fabText}>⚡ Generar Tour</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
  title: {
    ...typography.largeTitle,
  },
  subtitle: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  // Discovery Banner
  discoverBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(0, 212, 255, 0.2)',
  },
  discoverDot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
  },
  discoverContent: {
    flex: 1,
    gap: 2,
  },
  discoverTitle: {
    ...typography.headline,
    fontSize: 14,
    color: colors.primary,
  },
  discoverText: {
    ...typography.caption,
    fontSize: 12,
  },
  // Discovery Complete
  discoveryComplete: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.successSoft,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(52, 211, 153, 0.2)',
  },
  discoveryCompleteIcon: {
    fontSize: 14,
  },
  discoveryCompleteText: {
    ...typography.caption,
    color: colors.success,
    fontWeight: '600',
  },
  // List
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.sm,
  },
  // Card
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.md,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardEmoji: {
    fontSize: 22,
  },
  cardContent: {
    flex: 1,
    gap: 2,
  },
  cardName: {
    ...typography.headline,
    fontSize: 16,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cardType: {
    ...typography.caption,
    textTransform: 'capitalize',
  },
  cardDistance: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
  },
  cardAddress: {
    ...typography.caption,
    fontSize: 12,
    marginTop: 2,
  },
  // States
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  loadingText: {
    ...typography.body,
    marginTop: spacing.sm,
  },
  errorIcon: {
    fontSize: 48,
  },
  errorText: {
    ...typography.body,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  retryText: {
    ...typography.caption,
    color: colors.primary,
  },
  emptyIcon: {
    fontSize: 64,
  },
  emptyText: {
    ...typography.body,
    textAlign: 'center',
  },
  // FAB
  fab: {
    position: 'absolute',
    bottom: spacing.lg,
    right: spacing.lg,
    left: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: radii.lg,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.background,
  },
});
