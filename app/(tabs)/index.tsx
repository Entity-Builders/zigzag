import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
  Animated,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import MapView, { Marker, Circle, Region } from 'react-native-maps';
import { colors, typography, spacing, radii } from '../../constants/theme';
import {
  fetchSuggestedActivities,
  type SuggestedActivity,
  type SuggestionsMeta,
} from '../../api/suggestions';
import { discoverPlaces } from '../../api/places';
import { openNavigation } from '../../utils/navigation';
import VibesSheet from '../../components/VibesSheet';
import { VIBES, matchesFilters } from '../../constants/vibes';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
const MAP_HEIGHT_MINI = SCREEN_HEIGHT * 0.28;

const RADIUS_OPTIONS = [
  { label: '500m', value: 500 },
  { label: '1km', value: 1000 },
  { label: '2km', value: 2000 },
  { label: '5km', value: 5000 },
];

const PRICE_LABELS = ['Gratis', '$', '$$', '$$$'];

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

// ─── Activity Card ──────────────────────────────────────
function ActivityCard({
  activity,
  isSelected,
  onPress,
}: {
  activity: SuggestedActivity;
  isSelected: boolean;
  onPress: () => void;
}) {
  const router = useRouter();

  return (
    <TouchableOpacity
      style={[styles.card, isSelected && styles.cardSelected]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.cardEmoji}>{activity.emoji}</Text>
        <View style={styles.cardTitleWrap}>
          <Text style={styles.cardTitle}>{activity.title}</Text>
        </View>
      </View>

      <Text style={styles.cardDescription}>{activity.description}</Text>

      <View style={styles.cardMeta}>
        <Text style={styles.metaChip}>
          ⏱ {formatDuration(activity.estimatedDuration)}
        </Text>
        <Text style={styles.metaChip}>
          {PRICE_LABELS[activity.priceLevel] || 'Gratis'}
        </Text>
      </View>

      {activity.timeRelevance ? (
        <Text style={styles.cardTimeRelevance}>
          ✨ {activity.timeRelevance}
        </Text>
      ) : null}

      {activity.tags?.length > 0 ? (
        <View style={styles.tagRow}>
          {activity.tags.map((tag) => (
            <View key={tag} style={styles.tag}>
              <Text style={styles.tagText}>{tag}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.cardFooter}>
        {activity.places?.length > 0
          ? activity.places.map((place, idx) => (
              <TouchableOpacity
                key={place.id || idx}
                style={[styles.navButton, idx > 0 && { marginTop: 6 }]}
                onPress={() => openNavigation(place.lat, place.lng, place.name)}
              >
                <Text style={styles.navButtonText}>📍 {place.name}</Text>
              </TouchableOpacity>
            ))
          : null}
      </View>

      <TouchableOpacity
        style={styles.detailLink}
        onPress={() =>
          router.push({
            pathname: '/activity/[id]',
            params: { id: activity.id, data: JSON.stringify(activity) },
          })
        }
      >
        <Text style={styles.detailLinkText}>Ver detalle →</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

// ─── Loading ──────────────────────────────────────
function LoadingState() {
  return (
    <View style={styles.loadingContainer}>
      <View style={styles.loadingContent}>
        <Text style={styles.loadingEmoji}>⚡</Text>
        <Text style={styles.loadingTitle}>Preparando tu feed...</Text>
        <ActivityIndicator color={colors.primary} />
      </View>
    </View>
  );
}

// ─── Empty State ──────────────────────────────────────
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

// ═══════════════════════════════════════════════════════
// ─── Main Screen ──────────────────────────────────────
// ═══════════════════════════════════════════════════════

type ScreenMode = 'picker' | 'results';

export default function ForYouScreen() {
  const [mode, setMode] = useState<ScreenMode>('picker');
  const [activities, setActivities] = useState<SuggestedActivity[]>([]);
  const [meta, setMeta] = useState<SuggestionsMeta | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingFiltered, setLoadingFiltered] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [needsDiscovery, setNeedsDiscovery] = useState(false);
  const [discovering, setDiscovering] = useState(false);
  const [locationName, setLocationName] = useState('');
  const [userCoords, setUserCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [searchCoords, setSearchCoords] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [mapCenter, setMapCenter] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [searchRadius, setSearchRadius] = useState(2000);

  const mapRef = useRef<MapView>(null);
  const [selectedActivity, setSelectedActivity] =
    useState<SuggestedActivity | null>(null);

  // ─── Vibes filter state ───
  const [activeVibes, setActiveVibes] = useState<string[]>([]);
  const [transportFilter, setTransportFilter] = useState<string | null>(null);
  const [vibesSheetVisible, setVibesSheetVisible] = useState(false);

  // ─── Filtered activities (client-side) ───
  const filteredActivities = useMemo(
    () =>
      activities.filter((a) =>
        matchesFilters(
          a.tags || [],
          a.transportMode,
          activeVibes,
          transportFilter,
        ),
      ),
    [activities, activeVibes, transportFilter],
  );

  const activeFilterCount = activeVibes.length + (transportFilter ? 1 : 0);

  // ─── Get user location on mount ───
  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setInitializing(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = location.coords;
      setUserCoords({ lat: latitude, lng: longitude });
      setMapCenter({ lat: latitude, lng: longitude });

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

      setInitializing(false);
    })();
  }, []);

  // ─── Search at given coordinates ───
  const searchAt = useCallback(
    async (lat: number, lng: number, isRefresh = false) => {
      try {
        if (!isRefresh) setLoading(true);
        setSearchCoords({ lat, lng });

        // Update location name
        try {
          const [geo] = await Location.reverseGeocodeAsync({
            latitude: lat,
            longitude: lng,
          });
          if (geo) {
            setLocationName(
              geo.district || geo.subregion || geo.city || 'Tu ubicación',
            );
          }
        } catch {}

        const response = await fetchSuggestedActivities(lat, lng, {
          radius: searchRadius,
          count: 10,
          forceRefresh: isRefresh,
        });

        if (response.meta.placesFound === 0) {
          setNeedsDiscovery(true);
          setActivities([]);
        } else {
          setNeedsDiscovery(false);
          if (isRefresh) {
            setActivities(response.activities);
          } else {
            setActivities((prev) =>
              prev.length > 0 ? prev : response.activities,
            );
          }
          setMeta(response.meta);
        }
      } catch (err) {
        console.error('Suggestions error:', err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [searchRadius],
  );

  // ─── Confirm location from picker ───
  const handleConfirmLocation = useCallback(() => {
    if (!mapCenter) return;
    setMode('results');
    searchAt(mapCenter.lat, mapCenter.lng);
  }, [mapCenter, searchAt]);

  // ─── Go back to picker ───
  const handleRelocate = useCallback(() => {
    // Update mapCenter so the picker map renders at the right spot
    if (searchCoords) {
      setMapCenter({ lat: searchCoords.lat, lng: searchCoords.lng });
    }
    setMode('picker');
    setSelectedActivity(null);
  }, [searchCoords]);

  // ─── Refresh ───
  const handleRefresh = useCallback(() => {
    if (!searchCoords) return;
    setRefreshing(true);
    searchAt(searchCoords.lat, searchCoords.lng, true);
  }, [searchCoords, searchAt]);

  // ─── Load More ───
  const [loadingMore, setLoadingMore] = useState(false);
  const handleLoadMore = useCallback(async () => {
    if (!searchCoords || loadingMore) return;
    setLoadingMore(true);
    try {
      const existingIds = activities.map((a) => a.id);
      const response = await fetchSuggestedActivities(
        searchCoords.lat,
        searchCoords.lng,
        {
          radius: searchRadius,
          count: 6,
          forceRefresh: true,
          requestVibes: activeVibes.length > 0 ? activeVibes : undefined,
          requestTransport: transportFilter || undefined,
        },
      );
      // Append only genuinely new activities
      const newActivities = response.activities.filter(
        (a) => !existingIds.includes(a.id),
      );
      setActivities((prev) => [...prev, ...newActivities]);
    } catch (err) {
      console.error('Load more error:', err);
    } finally {
      setLoadingMore(false);
    }
  }, [searchCoords, loadingMore, activities, searchRadius]);

  // ─── Discover zone ───
  const handleDiscover = useCallback(async () => {
    if (!searchCoords) return;
    setDiscovering(true);
    try {
      await discoverPlaces(searchCoords.lat, searchCoords.lng, searchRadius);
      await searchAt(searchCoords.lat, searchCoords.lng, true);
    } catch (err) {
      console.error('Discovery error:', err);
    } finally {
      setDiscovering(false);
    }
  }, [searchCoords, searchAt]);

  // ─── Force rescan zone (re-discover places) ───
  const handleRescan = useCallback(async () => {
    if (!searchCoords) return;
    setDiscovering(true);
    try {
      await discoverPlaces(
        searchCoords.lat,
        searchCoords.lng,
        searchRadius,
        true,
      );
      await searchAt(searchCoords.lat, searchCoords.lng, true);
    } catch (err) {
      console.error('Rescan error:', err);
    } finally {
      setDiscovering(false);
    }
  }, [searchCoords, searchAt, searchRadius]);

  // ─── Load specific filtered options ───
  const handleLoadFiltered = useCallback(async () => {
    if (!searchCoords || loadingFiltered) return;
    setLoadingFiltered(true);
    try {
      const existingIds = activities.map((a) => a.id);
      const response = await fetchSuggestedActivities(
        searchCoords.lat,
        searchCoords.lng,
        {
          radius: searchRadius,
          count: 6,
          forceRefresh: true,
          requestVibes: activeVibes.length > 0 ? activeVibes : undefined,
          requestTransport: transportFilter || undefined,
        },
      );
      // Prepend only genuinely new activities so they show up at the top
      const newActivities = response.activities.filter(
        (a) => !existingIds.includes(a.id),
      );
      setActivities((prev) => [...newActivities, ...prev]);
    } catch (err) {
      console.error('Load filtered error:', err);
    } finally {
      setLoadingFiltered(false);
    }
  }, [
    searchCoords,
    loadingFiltered,
    activities,
    searchRadius,
    activeVibes,
    transportFilter,
  ]);

  // ─── Focus on activity ───
  const focusActivity = useCallback((activity: SuggestedActivity) => {
    setSelectedActivity(activity);
    if (activity.places.length > 1) {
      // Multiple places → fit all of them into the visible map area
      const coordinates = activity.places.map((p) => ({
        latitude: p.lat,
        longitude: p.lng,
      }));
      mapRef.current?.fitToCoordinates(coordinates, {
        edgePadding: { top: 60, right: 60, bottom: 60, left: 60 },
        animated: true,
      });
    } else if (activity.places.length === 1) {
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

  // Markers
  const allMarkers = activities.flatMap((a) =>
    a.places.map((p) => ({ ...p, activityId: a.id, emoji: a.emoji })),
  );

  // ─── Handle map region change (picker mode) ───
  const handleRegionChange = useCallback(
    (region: Region) => {
      if (mode === 'picker') {
        setMapCenter({ lat: region.latitude, lng: region.longitude });
      }
    },
    [mode],
  );

  if (initializing) {
    return <LoadingState />;
  }

  // ═══════════════════════════════════════════════════════
  // ─── PICKER MODE ────────────────────────────────────
  // ═══════════════════════════════════════════════════════
  if (mode === 'picker') {
    return (
      <View style={styles.container}>
        <MapView
          key='picker'
          ref={mapRef}
          style={styles.fullMap}
          initialRegion={
            mapCenter
              ? {
                  latitude: mapCenter.lat,
                  longitude: mapCenter.lng,
                  latitudeDelta: 0.02,
                  longitudeDelta: 0.02,
                }
              : undefined
          }
          showsUserLocation
          showsMyLocationButton
          userInterfaceStyle='dark'
          mapType='mutedStandard'
          onRegionChangeComplete={handleRegionChange}
        >
          {/* Radius circle */}
          {mapCenter && (
            <Circle
              center={{
                latitude: mapCenter.lat,
                longitude: mapCenter.lng,
              }}
              radius={searchRadius}
              fillColor='rgba(99, 102, 241, 0.08)'
              strokeColor='rgba(99, 102, 241, 0.3)'
              strokeWidth={1.5}
            />
          )}
        </MapView>

        {/* Crosshair pin (always centered) */}
        <View style={styles.crosshairContainer} pointerEvents='none'>
          <Text style={styles.crosshairPin}>📍</Text>
          <View style={styles.crosshairDot} />
        </View>

        {/* Bottom card */}
        <SafeAreaView edges={['bottom']} style={styles.pickerBottomCard}>
          <View style={styles.pickerContent}>
            <View style={styles.pickerTextContent}>
              <Text style={styles.pickerTitle}>¿Dónde exploramos?</Text>
              <Text style={styles.pickerSubtitle}>
                Mové el mapa para elegir la zona
              </Text>
            </View>

            {/* Radius chips */}
            <View style={styles.radiusRow}>
              <Text style={styles.radiusLabel}>Radio:</Text>
              {RADIUS_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.radiusChip,
                    searchRadius === opt.value && styles.radiusChipActive,
                  ]}
                  onPress={() => setSearchRadius(opt.value)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.radiusChipText,
                      searchRadius === opt.value && styles.radiusChipTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={handleConfirmLocation}
              activeOpacity={0.8}
            >
              <Text style={styles.confirmButtonText}>⚡ Buscar acá</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  // ═══════════════════════════════════════════════════════
  // ─── RESULTS MODE ──────────────────────────────────
  // ═══════════════════════════════════════════════════════
  return (
    <View style={styles.container}>
      {/* Mini Map */}
      <View>
        <MapView
          ref={mapRef}
          style={styles.miniMap}
          initialRegion={
            searchCoords
              ? {
                  latitude: searchCoords.lat,
                  longitude: searchCoords.lng,
                  latitudeDelta: 0.015,
                  longitudeDelta: 0.015,
                }
              : undefined
          }
          showsUserLocation
          showsMyLocationButton={false}
          userInterfaceStyle='dark'
          mapType='mutedStandard'
        >
          {/* Search radius */}
          {searchCoords && (
            <Circle
              center={{
                latitude: searchCoords.lat,
                longitude: searchCoords.lng,
              }}
              radius={searchRadius}
              fillColor='rgba(99, 102, 241, 0.06)'
              strokeColor='rgba(99, 102, 241, 0.2)'
              strokeWidth={1}
            />
          )}

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

        {/* Relocate button */}
        <TouchableOpacity
          style={styles.relocateButton}
          onPress={handleRelocate}
          activeOpacity={0.8}
        >
          <Text style={styles.relocateButtonText}>📍 Reubicar</Text>
        </TouchableOpacity>

        {/* Rescan button */}
        <TouchableOpacity
          style={[
            styles.relocateButton,
            { top: 100 },
            discovering && { opacity: 0.5 },
            { display: 'none' },
          ]}
          onPress={handleRescan}
          activeOpacity={0.8}
          disabled={discovering}
        >
          <Text style={styles.relocateButtonText}>
            {discovering ? '⏳ Escaneando...' : '🔄 Re-escanear'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Activity Feed */}
      <SafeAreaView edges={['bottom']} style={styles.feedContainer}>
        <View style={styles.feedHeader}>
          <View style={styles.feedHandle} />
          <View style={styles.feedHeaderContent}>
            <View style={styles.feedTitleRow}>
              <Text style={styles.feedTitle}>⚡ Para vos ahora</Text>
              <TouchableOpacity
                style={[
                  styles.settingsButton,
                  activeFilterCount > 0 && styles.settingsButtonActive,
                ]}
                onPress={() => setVibesSheetVisible(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.settingsButtonText}>
                  {activeFilterCount > 0 ? `✨ ${activeFilterCount}` : '✨'}
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.feedSubtitle}>
              📍 {locationName}
              {meta?.temporal ? ` · ${meta.temporal.momentOfDay}` : ''}
            </Text>
          </View>

          {/* Active filter chips */}
          {activeFilterCount > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.activeFiltersRow}
              contentContainerStyle={styles.activeFiltersContent}
            >
              {activeVibes.map((key) => {
                const v = VIBES.find((vb) => vb.key === key);
                if (!v) return null;
                return (
                  <TouchableOpacity
                    key={key}
                    style={styles.activeFilterChip}
                    onPress={() =>
                      setActiveVibes((prev) => prev.filter((k) => k !== key))
                    }
                    activeOpacity={0.7}
                  >
                    <Text style={styles.activeFilterText}>
                      {v.emoji} {v.label} ✕
                    </Text>
                  </TouchableOpacity>
                );
              })}
              {transportFilter && (
                <TouchableOpacity
                  style={styles.activeFilterChip}
                  onPress={() => setTransportFilter(null)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.activeFilterText}>
                    {transportFilter === 'walk'
                      ? '🚶 A pie'
                      : transportFilter === 'bike'
                        ? '🚲 Bici'
                        : transportFilter === 'car'
                          ? '🚗 Auto'
                          : '🚌 Transporte'}{' '}
                    ✕
                  </Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          )}
        </View>

        {loading ? (
          <View style={styles.discoveringState}>
            <ActivityIndicator size='small' color={colors.primary} />
            <Text style={styles.discoveringText}>Buscando actividades...</Text>
          </View>
        ) : needsDiscovery ? (
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
            data={filteredActivities}
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
            ListEmptyComponent={
              activeFilterCount > 0 ? (
                <View style={styles.filteredEmptyContainer}>
                  <Text style={styles.filteredEmptyEmoji}>🔍</Text>
                  <Text style={styles.filteredEmptyTitle}>
                    No hay actividades para este vibe
                  </Text>
                  <Text style={styles.filteredEmptySubtitle}>
                    Probá con otros filtros o quitá los actuales
                  </Text>

                  <TouchableOpacity
                    style={[styles.discoverButton, { marginTop: 16 }]}
                    onPress={handleLoadFiltered}
                    activeOpacity={0.8}
                    disabled={loadingFiltered}
                  >
                    <Text style={styles.discoverButtonText}>
                      {loadingFiltered
                        ? '⏳ Buscando...'
                        : '⏳ Buscar opciones específicas'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.clearFiltersButton, { marginTop: 12 }]}
                    onPress={() => {
                      setActiveVibes([]);
                      setTransportFilter(null);
                    }}
                    activeOpacity={0.7}
                    disabled={loadingFiltered}
                  >
                    <Text style={styles.clearFiltersText}>✨ Mostrar todo</Text>
                  </TouchableOpacity>
                </View>
              ) : null
            }
            ListFooterComponent={
              filteredActivities.length > 0 ? (
                <TouchableOpacity
                  style={[
                    styles.loadMoreButton,
                    loadingMore && { opacity: 0.5 },
                  ]}
                  onPress={handleLoadMore}
                  disabled={loadingMore}
                  activeOpacity={0.7}
                >
                  <Text style={styles.loadMoreText}>
                    {loadingMore ? '⏳ Buscando más...' : '✨ Dame más'}
                  </Text>
                </TouchableOpacity>
              ) : null
            }
          />
        )}
      </SafeAreaView>

      {/* Vibes Sheet */}
      <VibesSheet
        visible={vibesSheetVisible}
        activeVibes={activeVibes}
        transportFilter={transportFilter}
        onVibesChange={setActiveVibes}
        onTransportChange={setTransportFilter}
        onClose={() => setVibesSheetVisible(false)}
      />
    </View>
  );
}

// ═══════════════════════════════════════════════════════
// ─── Styles ──────────────────────────────────────────
// ═══════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  // ─── Picker Mode ───
  fullMap: {
    ...StyleSheet.absoluteFillObject,
  },
  crosshairContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  crosshairPin: {
    fontSize: 36,
    marginBottom: -8,
  },
  crosshairDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
    opacity: 0.6,
  },
  pickerBottomCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.background,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  pickerContent: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  pickerTextContent: {
    gap: 4,
  },
  pickerTitle: {
    ...typography.headline,
    fontSize: 22,
  },
  pickerSubtitle: {
    ...typography.body,
    fontSize: 14,
    color: colors.textSecondary,
  },
  confirmButton: {
    backgroundColor: colors.primary,
    borderRadius: radii.lg,
    paddingVertical: 16,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#fff',
  },
  // ─── Radius selector ───
  radiusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  radiusLabel: {
    ...typography.caption,
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginRight: 4,
  },
  radiusChip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  radiusChipActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  radiusChipText: {
    ...typography.caption,
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  radiusChipTextActive: {
    color: colors.primary,
    fontWeight: '800',
  },
  // ─── Results Mode ───
  miniMap: {
    width: '100%',
    height: MAP_HEIGHT_MINI,
  },
  relocateButton: {
    position: 'absolute',
    top: 52,
    right: spacing.md,
    backgroundColor: colors.background,
    borderRadius: radii.full,
    paddingVertical: 12,
    paddingHorizontal: spacing.lg,
    minHeight: 44,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  relocateButtonText: {
    ...typography.caption,
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
  },
  // ─── Feed ───
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
  // ─── Card ───
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
    flexWrap: 'wrap',
    gap: 6,
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
  // ─── Loading ───
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
  // ─── Empty ───
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
  // ─── Discovering ───
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
  // ─── Load More ───
  loadMoreButton: {
    alignItems: 'center',
    paddingVertical: 16,
    marginVertical: spacing.md,
    marginHorizontal: spacing.md,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
  },
  loadMoreText: {
    ...typography.body,
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
  },
  detailLink: {
    marginTop: spacing.sm,
    alignSelf: 'flex-end',
    paddingVertical: spacing.xs,
  },
  detailLinkText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },
  // ─── Vibes Filters ───
  feedTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingsButton: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  settingsButtonActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  settingsButtonText: {
    fontSize: 16,
  },
  activeFiltersRow: {
    marginTop: spacing.sm,
  },
  activeFiltersContent: {
    paddingHorizontal: spacing.lg,
    gap: 8,
  },
  activeFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: radii.full,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  activeFilterText: {
    ...typography.caption,
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  filteredEmptyContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  filteredEmptyEmoji: {
    fontSize: 40,
    marginBottom: spacing.sm,
  },
  filteredEmptyTitle: {
    ...typography.headline,
    textAlign: 'center',
  },
  filteredEmptySubtitle: {
    ...typography.body,
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  clearFiltersButton: {
    marginTop: spacing.md,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: radii.full,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  clearFiltersText: {
    ...typography.caption,
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
  },
});
