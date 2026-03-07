import { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
  Linking,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import MapView, { Marker, Region } from 'react-native-maps';
import { colors, typography, spacing, radii } from '../../constants/theme';
import {
  fetchSuggestedActivities,
  type SuggestedActivity,
  type SuggestionsMeta,
} from '../../api/suggestions';
import { discoverPlaces } from '../../api/places';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MAP_HEIGHT = SCREEN_HEIGHT * 0.3;

const PRICE_LABELS = ['Gratis', '$', '$$', '$$$'];

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

function openNavigation(lat: number, lng: number, label: string) {
  const encodedLabel = encodeURIComponent(label);
  const appleMapsUrl = `maps:0,0?q=${encodedLabel}&ll=${lat},${lng}`;
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

  const options: { text: string; onPress: () => void }[] = [];

  if (Platform.OS === 'ios') {
    options.push({
      text: '🍎 Apple Maps',
      onPress: () => Linking.openURL(appleMapsUrl),
    });
  }

  options.push({
    text: '🗺️ Google Maps',
    onPress: () => Linking.openURL(googleMapsUrl),
  });

  Alert.alert('¿Cómo querés llegar?', label, [
    ...options,
    { text: 'Cancelar', onPress: () => {}, style: 'cancel' as const },
  ]);
}

function ActivityCard({
  activity,
  onPress,
  isSelected,
}: {
  activity: SuggestedActivity;
  onPress?: () => void;
  isSelected?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.card, isSelected && styles.cardSelected]}
      activeOpacity={0.7}
      onPress={onPress}
    >
      {/* Emoji + Title */}
      <View style={styles.cardHeader}>
        <Text style={styles.cardEmoji}>{activity.emoji}</Text>
        <View style={styles.cardTitleWrap}>
          <Text style={styles.cardTitle} numberOfLines={2}>
            {activity.title}
          </Text>
        </View>
      </View>

      {/* Description */}
      <Text style={styles.cardDescription} numberOfLines={3}>
        {activity.description}
      </Text>

      {/* Meta row: duration · price · time relevance */}
      <View style={styles.cardMeta}>
        <Text style={styles.metaChip}>
          ⏱ {formatDuration(activity.estimatedDuration)}
        </Text>
        <Text style={styles.metaChip}>
          💰 {PRICE_LABELS[activity.priceLevel] || 'Gratis'}
        </Text>
      </View>

      {/* Time relevance */}
      <Text style={styles.cardTimeRelevance}>{activity.timeRelevance}</Text>

      {/* Tags + Navigate */}
      <View style={styles.cardFooter}>
        {activity.tags?.length > 0 && (
          <View style={styles.tagRow}>
            {activity.tags.slice(0, 3).map((tag) => (
              <View key={tag} style={styles.tag}>
                <Text style={styles.tagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}
        {activity.places.length > 0 && (
          <TouchableOpacity
            style={styles.navButton}
            onPress={(e) => {
              e.stopPropagation();
              const p = activity.places[0];
              openNavigation(p.lat, p.lng, p.name);
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.navButtonText}>📍 Cómo llego</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

function LoadingState() {
  return (
    <View style={styles.loadingContainer}>
      <View style={styles.loadingContent}>
        <Text style={styles.loadingEmoji}>⚡</Text>
        <Text style={styles.loadingTitle}>Pensando para vos...</Text>
        <Text style={styles.loadingSubtitle}>
          Analizando tu zona y el momento del día
        </Text>
        <ActivityIndicator
          size='large'
          color={colors.primary}
          style={{ marginTop: spacing.md }}
        />
      </View>
    </View>
  );
}

function EmptyState({ onDiscover }: { onDiscover: () => void }) {
  return (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyEmoji}>🗺️</Text>
      <Text style={styles.emptyTitle}>Zona sin explorar</Text>
      <Text style={styles.emptySubtitle}>
        No encontramos lugares cerca. ¿Querés que descubramos tu zona?
      </Text>
      <TouchableOpacity
        style={styles.discoverButton}
        onPress={onDiscover}
        activeOpacity={0.8}
      >
        <Text style={styles.discoverButtonText}>🔍 Descubrir zona</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function ForYouScreen() {
  const [activities, setActivities] = useState<SuggestedActivity[]>([]);
  const [meta, setMeta] = useState<SuggestionsMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [needsDiscovery, setNeedsDiscovery] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [locationName, setLocationName] = useState('Buscando...');
  const [region, setRegion] = useState<Region | null>(null);
  const [selectedActivity, setSelectedActivity] =
    useState<SuggestedActivity | null>(null);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const mapRef = useRef<MapView>(null);

  const loadSuggestions = useCallback(async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = location.coords;
      setCoords({ lat: latitude, lng: longitude });

      // Set map region
      setRegion({
        latitude,
        longitude,
        latitudeDelta: 0.015,
        longitudeDelta: 0.015,
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

      // Fetch AI suggestions
      const response = await fetchSuggestedActivities(latitude, longitude, {
        radius: 2000,
        count: 6,
        forceRefresh: isRefresh,
      });

      if (response.meta.placesFound === 0) {
        setNeedsDiscovery(true);
        setActivities([]);
      } else {
        setNeedsDiscovery(false);
        setActivities(response.activities);
        setMeta(response.meta);
      }
    } catch (err) {
      console.error('Suggestions error:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadSuggestions();
  }, [loadSuggestions]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadSuggestions(true);
  }, [loadSuggestions]);

  const handleDiscover = useCallback(async () => {
    if (!coords) return;
    setDiscovering(true);
    try {
      await discoverPlaces(coords.lat, coords.lng, 2000);
      // After discovery, reload suggestions
      await loadSuggestions(true);
    } catch (err) {
      console.error('Discovery error:', err);
    } finally {
      setDiscovering(false);
    }
  }, [coords, loadSuggestions]);

  const focusActivity = useCallback((activity: SuggestedActivity) => {
    setSelectedActivity(activity);
    if (activity.places.length > 0) {
      const place = activity.places[0];
      mapRef.current?.animateToRegion(
        {
          latitude: place.lat,
          longitude: place.lng,
          latitudeDelta: 0.008,
          longitudeDelta: 0.008,
        },
        300,
      );
    }
  }, []);

  // Get ALL place markers from activities
  const allMarkers = activities.flatMap((a) =>
    a.places.map((p) => ({ ...p, activityId: a.id, emoji: a.emoji })),
  );

  if (loading) {
    return <LoadingState />;
  }

  return (
    <View style={styles.container}>
      {/* Mini Map */}
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={region ?? undefined}
        showsUserLocation
        showsMyLocationButton={false}
        userInterfaceStyle='dark'
        mapType='mutedStandard'
      >
        {allMarkers.map((marker, i) => (
          <Marker
            key={`${marker.activityId}-${i}`}
            coordinate={{
              latitude: marker.lat,
              longitude: marker.lng,
            }}
            title={marker.name}
            pinColor={
              selectedActivity?.id === marker.activityId
                ? colors.primary
                : '#94a3b8'
            }
          />
        ))}
      </MapView>

      {/* Gradient overlay on map bottom */}
      <View style={styles.mapGradient} />

      {/* Activity Feed */}
      <SafeAreaView edges={['bottom']} style={styles.feedContainer}>
        {/* Header */}
        <View style={styles.feedHeader}>
          <View style={styles.feedHandle} />
          <View style={styles.feedHeaderContent}>
            <Text style={styles.feedTitle}>⚡ Para vos ahora</Text>
            <Text style={styles.feedSubtitle}>
              📍 {locationName}
              {meta?.temporal ? ` · ${meta.temporal.momentOfDay}` : ''}
            </Text>
          </View>
        </View>

        {/* Content */}
        {needsDiscovery ? (
          discovering ? (
            <View style={styles.discoveringState}>
              <ActivityIndicator size='small' color={colors.primary} />
              <Text style={styles.discoveringText}>Escaneando tu zona...</Text>
            </View>
          ) : (
            <EmptyState onDiscover={handleDiscover} />
          )
        ) : (
          <FlatList
            data={activities}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <ActivityCard
                activity={item}
                isSelected={selectedActivity?.id === item.id}
                onPress={() => focusActivity(item)}
              />
            )}
            contentContainerStyle={styles.feedList}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={colors.primary}
                title='Nuevas sugerencias...'
                titleColor={colors.textMuted}
              />
            }
          />
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  // Loading
  loadingContainer: {
    flex: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContent: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  loadingEmoji: {
    fontSize: 48,
  },
  loadingTitle: {
    ...typography.headline,
    fontSize: 20,
  },
  loadingSubtitle: {
    ...typography.body,
    textAlign: 'center',
  },
  // Map
  map: {
    width: '100%',
    height: MAP_HEIGHT,
  },
  mapGradient: {
    position: 'absolute',
    top: MAP_HEIGHT - 30,
    left: 0,
    right: 0,
    height: 30,
    backgroundColor: 'transparent',
  },
  // Feed
  feedContainer: {
    flex: 1,
    backgroundColor: colors.background,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    marginTop: -radii.xl,
  },
  feedHeader: {
    paddingTop: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  feedHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderLight,
    alignSelf: 'center',
    marginBottom: spacing.sm,
  },
  feedHeaderContent: {
    gap: 2,
  },
  feedTitle: {
    ...typography.headline,
    fontSize: 22,
  },
  feedSubtitle: {
    ...typography.caption,
    fontSize: 13,
  },
  feedList: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 40,
    gap: spacing.md,
  },
  // Card
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  cardSelected: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  cardEmoji: {
    fontSize: 28,
    marginTop: 2,
  },
  cardTitleWrap: {
    flex: 1,
  },
  cardTitle: {
    ...typography.headline,
    fontSize: 16,
    lineHeight: 22,
  },
  cardDescription: {
    ...typography.body,
    fontSize: 14,
    lineHeight: 20,
    color: colors.textSecondary,
  },
  cardMeta: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  metaChip: {
    ...typography.caption,
    fontSize: 12,
    backgroundColor: colors.surfaceElevated,
    paddingVertical: 3,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.md,
    overflow: 'hidden',
  },
  cardTimeRelevance: {
    ...typography.caption,
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
    fontStyle: 'italic',
  },
  tagRow: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  tag: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.full,
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
  },
  tagText: {
    ...typography.caption,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  navButton: {
    backgroundColor: colors.primarySoft,
    borderRadius: radii.full,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    marginLeft: 'auto',
  },
  navButtonText: {
    ...typography.caption,
    fontSize: 12,
    color: colors.primary,
    fontWeight: '700',
  },
  // Empty
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    gap: spacing.md,
  },
  emptyEmoji: {
    fontSize: 48,
  },
  emptyTitle: {
    ...typography.headline,
    fontSize: 20,
  },
  emptySubtitle: {
    ...typography.body,
    textAlign: 'center',
  },
  discoverButton: {
    backgroundColor: colors.primary,
    borderRadius: radii.lg,
    paddingVertical: 14,
    paddingHorizontal: spacing.xl,
    marginTop: spacing.sm,
  },
  discoverButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.background,
  },
  // Discovering
  discoveringState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  discoveringText: {
    ...typography.body,
    color: colors.primary,
  },
});
