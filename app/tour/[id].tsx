import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { fetchTourById, type Tour } from '../../api/tours';
import { colors, typography, spacing, radii } from '../../constants/theme';

const TRANSPORT_ICONS: Record<string, string> = {
  walk: '🚶',
  bus: '🚌',
  subway: '🚇',
  taxi: '🚕',
  cycle: '🚲',
  drive: '🚗',
  none: '📍',
};

const ACTIVITY_ICONS: Record<string, string> = {
  visit: '🏛️',
  eat: '🍽️',
  transport: '🚌',
  walk: '🚶',
  viewpoint: '👀',
  cafe: '☕',
  shop: '🛍️',
};

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

export default function TourDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [tour, setTour] = useState<Tour | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    fetchTourById(id)
      .then((data) => setTour(data as Tour))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <ActivityIndicator size='large' color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !tour) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centered}>
          <Text style={styles.errorIcon}>❌</Text>
          <Text style={styles.errorText}>{error || 'Tour no encontrado'}</Text>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backLink}>← Volver</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const activities = (tour.activities || []).sort(
    (a, b) => (a.order || 0) - (b.order || 0),
  );

  const totalDuration = activities.reduce(
    (sum, a) =>
      sum +
      (a.activity?.duration || a.activityData?.duration || a.duration || 0),
    0,
  );

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backLink}>← Volver</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{tour.name}</Text>
          {tour.description && (
            <Text style={styles.description}>{tour.description}</Text>
          )}

          {/* Stats */}
          <View style={styles.statsRow}>
            {activities.length > 0 && (
              <View style={styles.statBadge}>
                <Text style={styles.statValue}>{activities.length}</Text>
                <Text style={styles.statLabel}>paradas</Text>
              </View>
            )}
            {tour.totalDays && (
              <View style={styles.statBadge}>
                <Text style={styles.statValue}>{tour.totalDays}</Text>
                <Text style={styles.statLabel}>
                  {tour.totalDays === 1 ? 'día' : 'días'}
                </Text>
              </View>
            )}
            {totalDuration > 0 && (
              <View style={styles.statBadge}>
                <Text style={styles.statValue}>
                  {formatDuration(totalDuration)}
                </Text>
                <Text style={styles.statLabel}>duración</Text>
              </View>
            )}
          </View>

          {/* Categories */}
          {tour.categories && tour.categories.length > 0 && (
            <View style={styles.tags}>
              {tour.categories.map((cat, i) => (
                <View key={i} style={styles.tag}>
                  <Text style={styles.tagText}>{cat}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Timeline */}
        <View style={styles.timeline}>
          <Text style={styles.sectionTitle}>Itinerario</Text>
          {activities.map((act, index) => {
            const actType =
              act.activityType || act.activity?.type || 'visit';
            const actName =
              act.activityName || act.activity?.name || 'Parada';
            const actDesc = act.notes || act.activityData?.description || '';
            const actions = act.actions || [];
            const duration =
              act.activityData?.duration ||
              act.duration ||
              act.activity?.duration ||
              0;
            const transport = act.transportMode || 'walk';
            const isLast = index === activities.length - 1;

            return (
              <View key={index} style={styles.timelineItem}>
                {/* Connect line */}
                {!isLast && <View style={styles.timelineLine} />}

                {/* Dot */}
                <View style={styles.timelineDot}>
                  <Text style={styles.timelineDotText}>
                    {ACTIVITY_ICONS[actType] || '📍'}
                  </Text>
                </View>

                {/* Content */}
                <View style={styles.timelineContent}>
                  <View style={styles.timelineHeader}>
                    <Text style={styles.timelineName}>{actName}</Text>
                    {duration > 0 && (
                      <Text style={styles.timelineDuration}>
                        {formatDuration(duration)}
                      </Text>
                    )}
                  </View>
                  {actDesc ? (
                    <Text style={styles.timelineDesc}>{actDesc}</Text>
                  ) : null}

                  {/* Actions */}
                  {actions && actions.length > 0 && (
                    <View style={styles.actionsContainer}>
                      {actions.map((action: string, idx: number) => (
                        <View key={idx} style={styles.actionItem}>
                          <Text style={styles.actionDot}>•</Text>
                          <Text style={styles.actionText}>{action}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Transport to next */}
                  {!isLast && act.travelTimeToNext && (
                    <View style={styles.transportBadge}>
                      <Text style={styles.transportIcon}>
                        {TRANSPORT_ICONS[transport] || '🚶'}
                      </Text>
                      <Text style={styles.transportText}>
                        {transport} · {act.travelTimeToNext} min
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingBottom: spacing.xxl * 2,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  errorIcon: {
    fontSize: 48,
  },
  errorText: {
    ...typography.body,
    textAlign: 'center',
  },
  backLink: {
    ...typography.body,
    color: colors.primary,
  },
  // Header
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  title: {
    ...typography.largeTitle,
    fontSize: 28,
    marginTop: spacing.sm,
  },
  description: {
    ...typography.body,
    lineHeight: 24,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  statBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    backgroundColor: colors.surface,
    borderRadius: radii.full,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  statValue: {
    ...typography.headline,
    fontSize: 14,
    color: colors.primary,
  },
  statLabel: {
    ...typography.caption,
    fontSize: 11,
  },
  tags: {
    flexDirection: 'row',
    gap: spacing.xs,
    flexWrap: 'wrap',
    marginTop: spacing.xs,
  },
  tag: {
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radii.full,
  },
  tagText: {
    ...typography.label,
    fontSize: 10,
    color: colors.primary,
  },
  // Timeline
  timeline: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
  },
  sectionTitle: {
    ...typography.title,
    marginBottom: spacing.lg,
  },
  timelineItem: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
    position: 'relative',
  },
  timelineLine: {
    position: 'absolute',
    left: 18,
    top: 40,
    bottom: -spacing.lg,
    width: 2,
    backgroundColor: colors.border,
  },
  timelineDot: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timelineDotText: {
    fontSize: 16,
  },
  timelineContent: {
    flex: 1,
    gap: spacing.xs,
    paddingTop: 4,
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  timelineName: {
    ...typography.headline,
    fontSize: 16,
    flex: 1,
  },
  timelineDuration: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
  },
  timelineDesc: {
    ...typography.body,
    fontSize: 14,
    lineHeight: 20,
  },
  actionsContainer: {
    marginTop: spacing.xs,
    gap: 4,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  actionDot: {
    color: colors.primary,
    fontSize: 16,
    lineHeight: 20,
    fontWeight: 'bold',
  },
  actionText: {
    ...typography.body,
    fontSize: 13,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 18,
  },
  transportBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.surfaceElevated,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.sm,
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
  },
  transportIcon: {
    fontSize: 14,
  },
  transportText: {
    ...typography.caption,
    fontSize: 11,
    textTransform: 'capitalize',
  },
});
