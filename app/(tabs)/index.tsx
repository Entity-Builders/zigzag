import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { colors, typography, spacing, radii } from '../../constants/theme';
import { fetchNearbyPlaces, type Place } from '../../api/places';

const PLACE_ICONS: Record<string, string> = {
  park: '🌳',
  museum: '🏛️',
  restaurant: '🍽️',
  landmark: '📍',
  bus_stop: '🚌',
  subway_station: '🚇',
  market: '🛒',
  cafe: '☕',
  bar: '🍸',
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

export default function ExplorarScreen() {
  const [places, setPlaces] = useState<Place[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [locationName, setLocationName] = useState('Buscando...');

  const loadNearby = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError(null);

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

      const nearby = await fetchNearbyPlaces(latitude, longitude, 5000);
      setPlaces(nearby);
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
      ) : places.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyIcon}>🗺️</Text>
          <Text style={styles.emptyText}>
            No hay lugares registrados cerca tuyo
          </Text>
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
});
