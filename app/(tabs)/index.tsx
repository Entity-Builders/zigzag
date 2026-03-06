import { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import MapView, { Marker, Region } from 'react-native-maps';
import { colors, typography, spacing, radii } from '../../constants/theme';
import {
  fetchNearbyPlaces,
  discoverPlaces,
  type Place,
} from '../../api/places';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MAP_HEIGHT = SCREEN_HEIGHT * 0.45;
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

const MARKER_COLORS: Record<string, string> = {
  park: '#34d399',
  museum: '#818cf8',
  restaurant: '#fb923c',
  cafe: '#a78bfa',
  landmark: '#f87171',
  subway_station: '#38bdf8',
  train_station: '#38bdf8',
  bus_stop: '#94a3b8',
  market: '#fbbf24',
  theater: '#f472b6',
  gallery: '#c084fc',
};

function formatDistance(meters: number): string {
  if (meters < 1000) return `${Math.round(meters)}m`;
  return `${(meters / 1000).toFixed(1)}km`;
}

function PlaceCard({ place, onPress }: { place: Place; onPress?: () => void }) {
  const icon = PLACE_ICONS[place.type] ?? '📌';

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.7} onPress={onPress}>
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

function DiscoveringBanner() {
  return (
    <View style={styles.discoverBanner}>
      <ActivityIndicator size='small' color={colors.primary} />
      <Text style={styles.discoverText}>Descubriendo tu zona...</Text>
    </View>
  );
}

export default function ExplorarScreen() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [discovering, setDiscovering] = useState(false);
  const [locationName, setLocationName] = useState('Buscando...');
  const [region, setRegion] = useState<Region | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const mapRef = useRef<MapView>(null);
  const listRef = useRef<FlatList>(null);
  const router = useRouter();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Initial load
  const loadInitial = useCallback(async () => {
    try {
      setLoading(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = location.coords;

      // Set map region
      setRegion({
        latitude,
        longitude,
        latitudeDelta: 0.02,
        longitudeDelta: 0.02,
      });

      // Reverse geocode
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
      } catch {}

      // Fetch nearby
      const nearby = await fetchNearbyPlaces(latitude, longitude, 5000);
      setPlaces(nearby);

      // If not enough, trigger discovery
      if (nearby.length < MIN_PLACES_THRESHOLD) {
        setDiscovering(true);
        try {
          const result = await discoverPlaces(latitude, longitude, 3000);
          setPlaces(result.places);
        } catch {}
        setDiscovering(false);
      }
    } catch (err) {
      console.error('Load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInitial();
  }, [loadInitial]);

  // When user pans the map, refetch places for new center
  const onRegionChangeComplete = useCallback((newRegion: Region) => {
    setRegion(newRegion);

    // Debounce — wait 800ms after user stops panning
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const { latitude, longitude, latitudeDelta } = newRegion;
      // Approximate radius from latitudeDelta
      const radiusMeters = Math.round(latitudeDelta * 111000);

      try {
        const nearby = await fetchNearbyPlaces(
          latitude,
          longitude,
          radiusMeters,
        );
        setPlaces(nearby);

        // Discover if needed
        if (nearby.length < MIN_PLACES_THRESHOLD) {
          setDiscovering(true);
          try {
            const result = await discoverPlaces(
              latitude,
              longitude,
              radiusMeters,
            );
            setPlaces(result.places);
          } catch {}
          setDiscovering(false);
        }
      } catch {}
    }, 800);
  }, []);

  // Center map on a place when tapped in list
  const focusPlace = useCallback((place: Place) => {
    setSelectedPlace(place);
    mapRef.current?.animateToRegion(
      {
        latitude: place.latitude,
        longitude: place.longitude,
        latitudeDelta: 0.005,
        longitudeDelta: 0.005,
      },
      300,
    );
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size='large' color={colors.primary} />
        <Text style={styles.loadingText}>Cargando mapa...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Map */}
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={region ?? undefined}
        onRegionChangeComplete={onRegionChangeComplete}
        showsUserLocation
        showsMyLocationButton
        userInterfaceStyle='dark'
        mapType='mutedStandard'
      >
        {places.map((place) => (
          <Marker
            key={place.id}
            coordinate={{
              latitude: place.latitude,
              longitude: place.longitude,
            }}
            title={place.name}
            description={`${place.type.replace(/_/g, ' ')}${place.distance_meters ? ' · ' + formatDistance(place.distance_meters) : ''}`}
            pinColor={MARKER_COLORS[place.type] || colors.primary}
            onPress={() => setSelectedPlace(place)}
          />
        ))}
      </MapView>

      {/* List overlay */}
      <SafeAreaView edges={['bottom']} style={styles.listContainer}>
        {/* Header bar */}
        <View style={styles.listHeader}>
          <View style={styles.listHandle} />
          <View style={styles.listHeaderContent}>
            <Text style={styles.listTitle}>
              📍 {locationName} · {places.length} lugares
            </Text>
            {discovering && <DiscoveringBanner />}
          </View>
        </View>

        {/* Places list */}
        <FlatList
          ref={listRef}
          data={places}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <PlaceCard place={item} onPress={() => focusPlace(item)} />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />

        {/* FAB */}
        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push('/generate')}
          activeOpacity={0.85}
        >
          <Text style={styles.fabText}>⚡ Generar Tour</Text>
        </TouchableOpacity>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  loadingText: {
    ...typography.body,
  },
  // Map
  map: {
    width: '100%',
    height: MAP_HEIGHT,
  },
  // List container
  listContainer: {
    flex: 1,
    backgroundColor: colors.background,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    marginTop: -radii.xl,
  },
  listHeader: {
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  listHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderLight,
    alignSelf: 'center',
    marginBottom: spacing.sm,
  },
  listHeaderContent: {
    gap: spacing.xs,
  },
  listTitle: {
    ...typography.caption,
    fontSize: 13,
  },
  // Discovery
  discoverBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.primarySoft,
    borderRadius: radii.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    alignSelf: 'flex-start',
  },
  discoverText: {
    ...typography.caption,
    color: colors.primary,
    fontSize: 12,
  },
  // List
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 80,
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
    width: 44,
    height: 44,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardEmoji: {
    fontSize: 20,
  },
  cardContent: {
    flex: 1,
    gap: 2,
  },
  cardName: {
    ...typography.headline,
    fontSize: 15,
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cardType: {
    ...typography.caption,
    textTransform: 'capitalize',
    fontSize: 12,
  },
  cardDistance: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
    fontSize: 12,
  },
  cardAddress: {
    ...typography.caption,
    fontSize: 11,
    marginTop: 1,
  },
  // FAB
  fab: {
    position: 'absolute',
    bottom: spacing.lg,
    right: spacing.lg,
    left: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: radii.lg,
    paddingVertical: 14,
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
