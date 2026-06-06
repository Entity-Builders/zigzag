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
import { useRouter } from 'expo-router';
import { useAuth } from '../../contexts/AuthProvider';
import { colors, typography, spacing, radii } from '../../constants/theme';
import { fetchMyTours, fetchPublicTours, type Tour } from '../../api/tours';
import {
  trackCityDayReopened,
  trackPremiumInterestClicked,
} from '../../lib/analytics';
import {
  getCityDayIntent,
  getDayLength,
  getEffortLevel,
} from '../../constants/cityDay';

function TourCard({ tour, onPress }: { tour: Tour; onPress: () => void }) {
  const activityCount = tour.activities?.length ?? 0;
  const input = tour.metadata?.input || {};
  const decisionBrief = tour.metadata?.decisionBrief || input.decisionBrief || {};
  const optimizationIntent = getCityDayIntent(
    decisionBrief.optimizationIntent || input.optimizationIntent,
  );
  const dayLength = getDayLength(decisionBrief.dayLength);
  const effort = getEffortLevel(decisionBrief.effortLevel);
  const startContext =
    decisionBrief.startContext || input.destination || 'inicio por confirmar';
  const adjustmentCount = Array.isArray(
    tour.metadata?.cityDayAdjustments?.actions,
  )
    ? tour.metadata.cityDayAdjustments.actions.length
    : 0;
  const planState = adjustmentCount > 0 ? 'Plan ajustado' : 'Plan original';
  const contextItems = [
    `Optimiza: ${optimizationIntent.label}`,
    `Inicio: ${startContext}`,
    `Tiempo: ${dayLength.label}`,
    `Esfuerzo: ${effort.label}`,
  ];

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardName} numberOfLines={2}>
          {tour.name}
        </Text>
        {tour.categories && tour.categories.length > 0 && (
          <View style={styles.tags}>
            {tour.categories.slice(0, 3).map((cat, i) => (
              <View key={i} style={styles.tag}>
                <Text style={styles.tagText}>{cat}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      <View style={styles.planStateRow}>
        <Text style={styles.planState}>{planState}</Text>
        {adjustmentCount > 0 && (
          <Text style={styles.planStateMuted}>
            {adjustmentCount} ajuste{adjustmentCount === 1 ? '' : 's'}
          </Text>
        )}
      </View>

      {tour.description && (
        <Text style={styles.cardDescription} numberOfLines={2}>
          {tour.description}
        </Text>
      )}

      <View style={styles.contextList}>
        {contextItems.map((item) => (
          <View key={item} style={styles.contextPill}>
            <Text style={styles.contextPillText} numberOfLines={1}>
              {item}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.cardStats}>
        {activityCount > 0 && (
          <View style={styles.stat}>
            <Text style={styles.statValue}>{activityCount}</Text>
            <Text style={styles.statLabel}>
              {activityCount === 1 ? 'parada' : 'paradas'}
            </Text>
          </View>
        )}
        {tour.totalDays && (
          <View style={styles.stat}>
            <Text style={styles.statValue}>{tour.totalDays}</Text>
            <Text style={styles.statLabel}>
              {tour.totalDays === 1 ? 'día' : 'días'}
            </Text>
          </View>
        )}
        {tour.totalDistance && (
          <View style={styles.stat}>
            <Text style={styles.statValue}>
              {(tour.totalDistance / 1000).toFixed(1)}
            </Text>
            <Text style={styles.statLabel}>km</Text>
          </View>
        )}
        {tour.price != null && tour.price > 0 && (
          <View style={styles.stat}>
            <Text style={styles.statValue}>${tour.price}</Text>
            <Text style={styles.statLabel}>precio</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

function getPlanAnalytics(tour: Tour) {
  const input = tour.metadata?.input || {};
  const decisionBrief = tour.metadata?.decisionBrief || input.decisionBrief || {};
  const adjustmentCount = Array.isArray(
    tour.metadata?.cityDayAdjustments?.actions,
  )
    ? tour.metadata.cityDayAdjustments.actions.length
    : 0;

  return {
    optimization_intent:
      decisionBrief.optimizationIntent || input.optimizationIntent || 'must_see',
    day_length: decisionBrief.dayLength || input.dayLength || 'half_day',
    effort_level: decisionBrief.effortLevel || input.effortLevel || 'moderate',
    adjustment_count: adjustmentCount,
    saved_plan_state: adjustmentCount > 0 ? 'adjusted' : 'original',
  };
}

export default function MyToursScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [myTours, setMyTours] = useState<Tour[]>([]);
  const [publicTours, setPublicTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState<'mine' | 'public'>('mine');

  const loadTours = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);

        const [mine, pub] = await Promise.all([
          user ? fetchMyTours(user.id) : Promise.resolve([]),
          fetchPublicTours(20),
        ]);

        setMyTours(mine as Tour[]);
        setPublicTours(pub as Tour[]);
      } catch (err) {
        console.error('Error loading tours:', err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [user],
  );

  useEffect(() => {
    loadTours();
  }, [loadTours]);

  const activeTours = tab === 'mine' ? myTours : publicTours;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Mis planes</Text>
        <Text style={styles.subtitle}>
          Guardá City Days que resolvieron una decisión real: contexto,
          ajustes, versiones futuras y reutilización viven acá.
        </Text>
        <TouchableOpacity
          style={styles.premiumInterestButton}
          onPress={() => trackPremiumInterestClicked('my_tours_header')}
          activeOpacity={0.75}
        >
          <Text style={styles.premiumInterestText}>
            Me interesa comparar variantes
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, tab === 'mine' && styles.tabActive]}
          onPress={() => setTab('mine')}
        >
          <Text
            style={[styles.tabText, tab === 'mine' && styles.tabTextActive]}
          >
            Mis planes ({myTours.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, tab === 'public' && styles.tabActive]}
          onPress={() => setTab('public')}
        >
          <Text
            style={[styles.tabText, tab === 'public' && styles.tabTextActive]}
          >
            Público ({publicTours.length})
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size='large' color={colors.primary} />
        </View>
      ) : activeTours.length === 0 ? (
        <View style={styles.centered}>
          <Text style={styles.emptyIcon}>{tab === 'mine' ? '⚡' : '🌍'}</Text>
          <Text style={styles.emptyTitle}>
            {tab === 'mine' ? 'Sin planes todavía' : 'Sin planes públicos'}
          </Text>
          <Text style={styles.emptyText}>
            {tab === 'mine'
              ? 'Generá un City Day, ajustalo si hace falta y guardá el plan que realmente te simplifica el día.'
              : 'Los planes públicos aparecerán acá cuando existan rutas compartibles.'}
          </Text>
          {tab === 'mine' && (
            <TouchableOpacity
              style={styles.generateCta}
              onPress={() => router.push('/generate')}
              activeOpacity={0.8}
            >
              <Text style={styles.generateCtaText}>Plan A City Day</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        <FlatList
          data={activeTours}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TourCard
              tour={item}
              onPress={() => {
                trackCityDayReopened(item.id, {
                  source: tab === 'mine' ? 'my_tours' : 'public_tours',
                  ...getPlanAnalytics(item),
                });
                router.push(`/tour/${item.id}`);
              }}
            />
          )}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => loadTours(true)}
              tintColor={colors.primary}
            />
          }
        />
      )}

      {/* FAB - Generate Tour */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => router.push('/generate')}
        activeOpacity={0.85}
      >
        <Text style={styles.fabText}>Plan A City Day</Text>
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
    paddingBottom: spacing.sm,
  },
  title: {
    ...typography.largeTitle,
  },
  subtitle: {
    ...typography.caption,
    lineHeight: 18,
    marginTop: spacing.xs,
  },
  premiumInterestButton: {
    alignSelf: 'flex-start',
    borderRadius: radii.full,
    borderWidth: 1,
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
  },
  premiumInterestText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '800',
  },
  // Tabs
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  tab: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  tabText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  // List
  list: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl,
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
  cardHeader: {
    gap: spacing.sm,
  },
  cardName: {
    ...typography.headline,
  },
  planStateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  planState: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '800',
  },
  planStateMuted: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 11,
  },
  cardDescription: {
    ...typography.body,
    fontSize: 14,
  },
  contextList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  contextPill: {
    maxWidth: '100%',
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radii.full,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
  },
  contextPillText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '700',
  },
  tags: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
  },
  tag: {
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.full,
  },
  tagText: {
    ...typography.label,
    fontSize: 10,
    color: colors.textSecondary,
  },
  // Stats
  cardStats: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginTop: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  statValue: {
    ...typography.headline,
    fontSize: 16,
    color: colors.primary,
  },
  statLabel: {
    ...typography.caption,
    fontSize: 11,
  },
  // States
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
  },
  emptyIcon: {
    fontSize: 64,
  },
  emptyTitle: {
    ...typography.title,
    fontSize: 20,
  },
  emptyText: {
    ...typography.body,
    textAlign: 'center',
  },
  generateCta: {
    backgroundColor: colors.primary,
    borderRadius: radii.lg,
    paddingVertical: 14,
    paddingHorizontal: spacing.xl,
    marginTop: spacing.sm,
  },
  generateCtaText: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.background,
  },
  fab: {
    position: 'absolute',
    bottom: 100,
    right: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: radii.full,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.background,
  },
});
