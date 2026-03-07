import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing, radii } from '../../constants/theme';

const PRICE_LABELS = ['Gratis', '$', '$$', '$$$'];

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

function openNavigation(lat: number, lng: number, label: string) {
  const encoded = encodeURIComponent(label);
  const appleMapsUrl = `maps:0,0?q=${encoded}&ll=${lat},${lng}`;
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encoded}&center=${lat},${lng}`;

  const options: any[] = [];
  if (Platform.OS === 'ios') {
    options.push({
      text: 'Apple Maps',
      onPress: () => Linking.openURL(appleMapsUrl),
    });
  }
  options.push({
    text: 'Google Maps',
    onPress: () => Linking.openURL(googleMapsUrl),
  });

  Alert.alert('¿Cómo querés llegar?', label, [
    ...options,
    { text: 'Cancelar', style: 'cancel' as const },
  ]);
}

export default function ActivityDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ data: string }>();

  let activity: any;
  try {
    activity = JSON.parse(params.data || '{}');
  } catch {
    activity = {};
  }

  const places = activity.places || [];
  const tags = activity.tags || [];

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Text style={styles.backText}>← Volver</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.heroEmoji}>{activity.emoji}</Text>
          <Text style={styles.heroTitle}>{activity.title}</Text>

          <View style={styles.metaRow}>
            <View style={styles.metaChip}>
              <Text style={styles.metaChipText}>
                ⏱ {formatDuration(activity.estimatedDuration || 0)}
              </Text>
            </View>
            <View style={styles.metaChip}>
              <Text style={styles.metaChipText}>
                {PRICE_LABELS[activity.priceLevel] || 'Gratis'}
              </Text>
            </View>
            {activity.setting && activity.setting !== 'any' && (
              <View style={styles.metaChip}>
                <Text style={styles.metaChipText}>
                  {activity.setting === 'indoor' ? '🏠 Indoor' : '🌳 Outdoor'}
                </Text>
              </View>
            )}
          </View>

          {activity.timeRelevance ? (
            <Text style={styles.timeRelevance}>
              ✨ {activity.timeRelevance}
            </Text>
          ) : null}
        </View>

        {/* Description */}
        <View style={styles.section}>
          <Text style={styles.descriptionText}>{activity.description}</Text>
        </View>

        {/* Stops / Places */}
        {places.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>📍 Recorrido</Text>
            {places.map((place: any, idx: number) => (
              <View key={place.id || idx}>
                <View style={styles.stopCard}>
                  <View style={styles.stopNumber}>
                    <Text style={styles.stopNumberText}>{idx + 1}</Text>
                  </View>
                  <View style={styles.stopContent}>
                    <Text style={styles.stopName}>{place.name}</Text>
                    <TouchableOpacity
                      style={styles.stopNavButton}
                      onPress={() =>
                        openNavigation(place.lat, place.lng, place.name)
                      }
                    >
                      <Text style={styles.stopNavText}>📍 Cómo llego</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Connector line between stops */}
                {idx < places.length - 1 ? (
                  <View style={styles.connector}>
                    <View style={styles.connectorLine} />
                    <Text style={styles.connectorText}>🚶 Caminando</Text>
                    <View style={styles.connectorLine} />
                  </View>
                ) : null}
              </View>
            ))}
          </View>
        ) : null}

        {/* Tags */}
        {tags.length > 0 ? (
          <View style={styles.section}>
            <View style={styles.tagRow}>
              {tags.map((tag: string) => (
                <View key={tag} style={styles.tag}>
                  <Text style={styles.tagText}>{tag}</Text>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* Bottom spacer */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  backButton: {
    paddingVertical: spacing.xs,
  },
  backText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
  },

  // Hero
  hero: {
    alignItems: 'center',
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  heroEmoji: {
    fontSize: 48,
    marginBottom: spacing.sm,
  },
  heroTitle: {
    ...typography.title,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  metaRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  metaChip: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  metaChipText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  timeRelevance: {
    ...typography.caption,
    color: colors.warning,
    fontStyle: 'italic',
    marginTop: spacing.xs,
  },

  // Description
  section: {
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionTitle: {
    ...typography.headline,
    marginBottom: spacing.md,
  },
  descriptionText: {
    ...typography.body,
    lineHeight: 24,
  },

  // Stops
  stopCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stopNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  stopNumberText: {
    ...typography.headline,
    color: colors.primary,
    fontSize: 14,
  },
  stopContent: {
    flex: 1,
  },
  stopName: {
    ...typography.headline,
    fontSize: 16,
    marginBottom: spacing.sm,
  },
  stopNavButton: {
    backgroundColor: colors.primarySoft,
    borderRadius: radii.full,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    alignSelf: 'flex-start',
  },
  stopNavText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
  },

  // Connector
  connector: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  connectorLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  connectorText: {
    ...typography.caption,
    color: colors.textMuted,
    marginHorizontal: spacing.sm,
  },

  // Tags
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tag: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: radii.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  tagText: {
    ...typography.label,
    color: colors.textMuted,
  },
});
