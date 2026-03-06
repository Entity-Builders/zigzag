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
import { useAuth } from '../../contexts/AuthProvider';
import { colors, typography, spacing, radii } from '../../constants/theme';
import { fetchMyTours, fetchPublicTours, type Tour } from '../../api/tours';

function TourCard({ tour }: { tour: Tour }) {
  const activityCount = tour.activities?.length ?? 0;

  return (
    <TouchableOpacity style={styles.card} activeOpacity={0.7}>
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

      {tour.description && (
        <Text style={styles.cardDescription} numberOfLines={2}>
          {tour.description}
        </Text>
      )}

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

export default function MyToursScreen() {
  const { user } = useAuth();
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
        <Text style={styles.title}>Tours</Text>
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
            Mis Tours ({myTours.length})
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
            {tab === 'mine' ? 'Sin tours todavía' : 'Sin tours públicos'}
          </Text>
          <Text style={styles.emptyText}>
            {tab === 'mine'
              ? 'Generá tu primer tour desde Explorar'
              : 'Los tours generados aparecerán acá'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={activeTours}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <TourCard tour={item} />}
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
  cardDescription: {
    ...typography.body,
    fontSize: 14,
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
});
