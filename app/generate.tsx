import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Location from 'expo-location';
import { useAuth } from '../contexts/AuthProvider';
import { generateTour } from '../api/tours';
import { colors, typography, spacing, radii } from '../constants/theme';

const QUICK_PROMPTS = [
  {
    label: '🚶 Caminata cultural',
    prompt: 'Un tour a pie por lugares culturales cercanos',
  },
  {
    label: '🍽️ Ruta gastronómica',
    prompt: 'Un recorrido por restaurantes y cafés interesantes',
  },
  {
    label: '🌳 Parques y aire libre',
    prompt: 'Un día al aire libre visitando parques y plazas',
  },
  {
    label: '🏛️ Museos y arte',
    prompt: 'Un tour por museos y galerías de arte',
  },
  {
    label: '🌃 Tour nocturno',
    prompt: 'Un recorrido nocturno por bares y teatro',
  },
];

const RADIUS_OPTIONS = [
  { label: '1 km', value: 1000 },
  { label: '2 km', value: 2000 },
  { label: '5 km', value: 5000 },
  { label: '10 km', value: 10000 },
];

function formatRadius(meters: number): string {
  if (meters < 1000) return `${meters}m`;
  return `${(meters / 1000).toFixed(meters % 1000 === 0 ? 0 : 1)} km`;
}

export default function GenerateTourScreen() {
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [radius, setRadius] = useState(3000);
  const [locationMode, setLocationMode] = useState<'current' | 'custom'>(
    'current',
  );
  const [customLocation, setCustomLocation] = useState('');
  const [currentLocationName, setCurrentLocationName] = useState('Buscando...');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    null,
  );
  const { user } = useAuth();
  const router = useRouter();

  // Get current location on mount
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setCurrentLocationName('Sin permiso');
          return;
        }
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setCoords({
          lat: location.coords.latitude,
          lng: location.coords.longitude,
        });

        // Reverse geocode
        const [geo] = await Location.reverseGeocodeAsync({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
        if (geo) {
          setCurrentLocationName(
            [geo.district || geo.subregion, geo.city]
              .filter(Boolean)
              .join(', ') || 'Tu ubicación',
          );
        }
      } catch {
        setCurrentLocationName('No disponible');
      }
    })();
  }, []);

  const handleGenerate = async (tourPrompt: string) => {
    if (!tourPrompt.trim()) {
      Alert.alert('Error', 'Describí qué tipo de tour querés');
      return;
    }

    setGenerating(true);

    try {
      // Build the prompt with location context if custom
      let finalPrompt = tourPrompt.trim();
      if (locationMode === 'custom' && customLocation.trim()) {
        finalPrompt = `${finalPrompt}. Zona: ${customLocation.trim()}`;
      }

      const tour = await generateTour({
        prompt: finalPrompt,
        radius,
        ...(coords && {
          latitude: coords.lat,
          longitude: coords.lng,
          destinationLatitude: coords.lat,
          destinationLongitude: coords.lng,
        }),
      });

      if (tour?.id) {
        router.replace(`/tour/${tour.id}`);
      } else {
        Alert.alert('¡Tour generado!', tour?.name || 'Tu tour fue creado', [
          {
            text: 'Ver tours',
            onPress: () => router.replace('/(tabs)/my-tours'),
          },
        ]);
      }
    } catch (err: any) {
      Alert.alert('Error', err.message || 'No se pudo generar el tour');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}
      >
        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps='handled'
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Text style={styles.backText}>← Volver</Text>
            </TouchableOpacity>
            <Text style={styles.title}>Generar Tour ⚡</Text>
            <Text style={styles.subtitle}>
              Describí tu día ideal y ZigZag lo arma por vos
            </Text>
          </View>

          {/* Input */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>¿Qué querés hacer?</Text>
            <TextInput
              style={styles.textArea}
              placeholder='Ej: Quiero un tour a pie por Palermo visitando museos y parando a tomar café...'
              placeholderTextColor={colors.textMuted}
              value={prompt}
              onChangeText={setPrompt}
              multiline
              numberOfLines={4}
              textAlignVertical='top'
              editable={!generating}
            />
          </View>

          {/* Location Controls */}
          <View style={styles.settingsSection}>
            <Text style={styles.settingsTitle}>📍 Ubicación</Text>
            <View style={styles.locationTabs}>
              <TouchableOpacity
                style={[
                  styles.locationTab,
                  locationMode === 'current' && styles.locationTabActive,
                ]}
                onPress={() => setLocationMode('current')}
              >
                <Text
                  style={[
                    styles.locationTabText,
                    locationMode === 'current' && styles.locationTabTextActive,
                  ]}
                >
                  Mi ubicación
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.locationTab,
                  locationMode === 'custom' && styles.locationTabActive,
                ]}
                onPress={() => setLocationMode('custom')}
              >
                <Text
                  style={[
                    styles.locationTabText,
                    locationMode === 'custom' && styles.locationTabTextActive,
                  ]}
                >
                  Otra zona
                </Text>
              </TouchableOpacity>
            </View>

            {locationMode === 'current' ? (
              <View style={styles.currentLocationBadge}>
                <Text style={styles.currentLocationIcon}>📍</Text>
                <Text style={styles.currentLocationText}>
                  {currentLocationName}
                </Text>
              </View>
            ) : (
              <TextInput
                style={styles.locationInput}
                placeholder='Ej: San Telmo, Palermo, Recoleta...'
                placeholderTextColor={colors.textMuted}
                value={customLocation}
                onChangeText={setCustomLocation}
                editable={!generating}
              />
            )}
          </View>

          {/* Radius Slider */}
          <View style={styles.settingsSection}>
            <View style={styles.radiusHeader}>
              <Text style={styles.settingsTitle}>📐 Radio de búsqueda</Text>
              <Text style={styles.radiusValue}>{formatRadius(radius)}</Text>
            </View>
            <Slider
              style={styles.slider}
              minimumValue={500}
              maximumValue={15000}
              step={500}
              value={radius}
              onValueChange={setRadius}
              minimumTrackTintColor={colors.primary}
              maximumTrackTintColor={colors.border}
              thumbTintColor={colors.primary}
            />
            <View style={styles.radiusQuickRow}>
              {RADIUS_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.radiusChip,
                    radius === opt.value && styles.radiusChipActive,
                  ]}
                  onPress={() => setRadius(opt.value)}
                >
                  <Text
                    style={[
                      styles.radiusChipText,
                      radius === opt.value && styles.radiusChipTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Quick Prompts */}
          <View style={styles.quickSection}>
            <Text style={styles.quickLabel}>O elegí uno rápido</Text>
            <View style={styles.quickGrid}>
              {QUICK_PROMPTS.map((qp, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.quickChip}
                  onPress={() => {
                    setPrompt(qp.prompt);
                    handleGenerate(qp.prompt);
                  }}
                  disabled={generating}
                  activeOpacity={0.7}
                >
                  <Text style={styles.quickChipText}>{qp.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Generate Button */}
          <TouchableOpacity
            style={[styles.generateButton, generating && styles.buttonDisabled]}
            onPress={() => handleGenerate(prompt)}
            disabled={generating || !prompt.trim()}
            activeOpacity={0.8}
          >
            {generating ? (
              <View style={styles.generatingState}>
                <ActivityIndicator color={colors.background} />
                <Text style={styles.generatingText}>Generando tu tour...</Text>
              </View>
            ) : (
              <Text style={styles.generateText}>⚡ Generar Tour</Text>
            )}
          </TouchableOpacity>

          {generating && (
            <Text style={styles.aiNote}>
              Buscando lugares en un radio de {formatRadius(radius)} y armando
              un itinerario con AI
            </Text>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xxl * 2,
  },
  // Header
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
  },
  backButton: {
    marginBottom: spacing.md,
  },
  backText: {
    ...typography.body,
    color: colors.primary,
  },
  title: {
    ...typography.largeTitle,
  },
  subtitle: {
    ...typography.body,
    marginTop: spacing.xs,
  },
  // Input
  inputSection: {
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  inputLabel: {
    ...typography.headline,
    fontSize: 16,
  },
  textArea: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    fontSize: 16,
    color: colors.text,
    minHeight: 100,
  },
  // Settings
  settingsSection: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  settingsTitle: {
    ...typography.headline,
    fontSize: 15,
  },
  // Location
  locationTabs: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  locationTab: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  locationTabActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  locationTabText: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 14,
  },
  locationTabTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  currentLocationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  currentLocationIcon: {
    fontSize: 16,
  },
  currentLocationText: {
    ...typography.body,
    fontSize: 14,
  },
  locationInput: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    fontSize: 15,
    color: colors.text,
  },
  // Radius
  radiusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  radiusValue: {
    ...typography.headline,
    fontSize: 16,
    color: colors.primary,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  radiusQuickRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  radiusChip: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  radiusChipActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  radiusChipText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  radiusChipTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  // Quick Prompts
  quickSection: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  quickLabel: {
    ...typography.caption,
  },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  quickChip: {
    backgroundColor: colors.surface,
    borderRadius: radii.full,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickChipText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 14,
  },
  // Generate
  generateButton: {
    backgroundColor: colors.primary,
    borderRadius: radii.lg,
    paddingVertical: 18,
    marginHorizontal: spacing.lg,
    marginTop: spacing.xl,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  generateText: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.background,
  },
  generatingState: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  generatingText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.background,
  },
  aiNote: {
    ...typography.caption,
    textAlign: 'center',
    marginTop: spacing.md,
    paddingHorizontal: spacing.xl,
    fontSize: 12,
  },
});
