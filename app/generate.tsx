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
  ScrollView,
} from 'react-native';
import Slider from '@react-native-community/slider';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { generateTour, updateTourMetadata } from '../api/tours';
import { type ExperienceBlueprintVibe } from '@entity-builders/zigzag-logic';
import { colors, typography, spacing, radii } from '../constants/theme';
import { getInitialLocation, type Coordinates } from '../lib/location';
import { showAlert } from '../utils/alerts';
import { trackCityDayGenerated, trackCityDaySaved } from '../lib/analytics';
import {
  AVOIDANCE_OPTIONS,
  CITY_DAY_INTENTS,
  DAY_LENGTH_OPTIONS,
  EFFORT_OPTIONS,
  type Avoidance,
  type CityDayIntent,
  type DayLength,
  type EffortLevel,
} from '../constants/cityDay';

const QUICK_PROMPTS = [
  {
    label: 'Caminata cultural',
    prompt: 'Un tour a pie por lugares culturales cercanos',
  },
  {
    label: 'Ruta gastronómica',
    prompt: 'Un recorrido por restaurantes y cafés interesantes',
  },
  {
    label: 'Parques y aire libre',
    prompt: 'Un día al aire libre visitando parques y plazas',
  },
  {
    label: 'Museos y arte',
    prompt: 'Un tour por museos y galerías de arte',
  },
  {
    label: 'Tour nocturno',
    prompt: 'Un recorrido nocturno por bares y teatro',
  },
];

const RADIUS_OPTIONS = [
  { label: '1 km', value: 1000 },
  { label: '2 km', value: 2000 },
  { label: '5 km', value: 5000 },
  { label: '10 km', value: 10000 },
];

const VIBE_OPTIONS: {
  label: string;
  value: ExperienceBlueprintVibe;
  icon: string;
}[] = [
  { label: 'Sorprendeme', value: 'random', icon: '🎲' },
  { label: 'Balance', value: 'balancer', icon: '⚖️' },
  { label: 'Naturaleza', value: 'nature_immersion', icon: '🌳' },
  { label: 'Social', value: 'social_explorer', icon: '🍻' },
  { label: 'Foco Profundo', value: 'deep_focus', icon: '☕' },
];

const DAY_OPTIONS = [1, 2, 3] as const;

const PACE_OPTIONS = [
  { label: 'Relax', value: 'relaxed', hint: 'menos paradas' },
  { label: 'Balance', value: 'moderate', hint: 'ritmo normal' },
  { label: 'Intenso', value: 'fast', hint: 'más movimiento' },
] as const;

const BUDGET_OPTIONS = [
  { label: '$', value: 'low', hint: 'low cost' },
  { label: '$$', value: 'medium', hint: 'medio' },
  { label: '$$$', value: 'high', hint: 'premium' },
] as const;

const INTEREST_OPTIONS = [
  { label: 'Cultura', value: 'culture' },
  { label: 'Comida', value: 'food' },
  { label: 'Aire libre', value: 'outdoors' },
  { label: 'Museos', value: 'museums' },
  { label: 'Noche', value: 'nightlife' },
  { label: 'Familia', value: 'family' },
] as const;

const TRANSPORT_OPTIONS = [
  { label: 'A pie', value: 'walking' },
  { label: 'Bici', value: 'cycling' },
  { label: 'Auto', value: 'driving' },
  { label: 'Transporte', value: 'public_transport' },
] as const;

const FOOD_OPTIONS = [
  {
    label: 'Sin comida',
    value: 'none',
    prompt: 'No incluir paradas de comida salvo que sean imprescindibles.',
  },
  {
    label: 'Café rápido',
    value: 'quick_cafe',
    prompt: 'Incluir una pausa breve para café o algo simple.',
  },
  {
    label: 'Almuerzo tranquilo',
    value: 'relaxed_lunch',
    prompt: 'Incluir una pausa de almuerzo tranquila dentro del recorrido.',
  },
  {
    label: 'Barato',
    value: 'low_cost_food',
    prompt: 'Priorizar opciones de comida accesibles.',
  },
  {
    label: 'Vegetariano',
    value: 'vegetarian',
    prompt: 'Preferir opciones vegetarianas cuando haya comida.',
  },
  {
    label: 'Algo local',
    value: 'local_food',
    prompt: 'Incluir comida o café con sabor local si encaja en la ruta.',
  },
] as const;

const GROUP_OPTIONS = [
  {
    label: 'Solo',
    value: 'solo',
    groupType: 'solo',
    prompt: 'Viaja una persona.',
  },
  {
    label: 'Pareja',
    value: 'couple',
    groupType: 'couple',
    prompt: 'Viajan dos personas.',
  },
  {
    label: 'Familia',
    value: 'family',
    groupType: 'family',
    prompt: 'Viaja una familia; priorizar paradas aptas para chicos.',
  },
  {
    label: 'Amigos',
    value: 'friends',
    groupType: 'friends',
    prompt: 'Viaja un grupo de amigos.',
  },
  {
    label: 'Ritmo suave',
    value: 'easy_mobility',
    groupType: undefined,
    prompt:
      'Priorizar distancias cortas, pocas escaleras y transiciones simples.',
  },
] as const;

type DayCount = (typeof DAY_OPTIONS)[number];
type PaceValue = (typeof PACE_OPTIONS)[number]['value'];
type BudgetValue = (typeof BUDGET_OPTIONS)[number]['value'];
type InterestValue = (typeof INTEREST_OPTIONS)[number]['value'];
type TransportValue = (typeof TRANSPORT_OPTIONS)[number]['value'];
type FoodIntent = (typeof FOOD_OPTIONS)[number]['value'];
type GroupContext = (typeof GROUP_OPTIONS)[number]['value'];

function formatRadius(meters: number): string {
  if (meters < 1000) return `${meters}m`;
  return `${(meters / 1000).toFixed(meters % 1000 === 0 ? 0 : 1)} km`;
}

export default function GenerateTourScreen() {
  const [prompt, setPrompt] = useState('');
  const [generating, setGenerating] = useState(false);
  const [radius, setRadius] = useState(3000);
  const [days, setDays] = useState<DayCount>(1);
  const [vibe, setVibe] = useState<ExperienceBlueprintVibe>('random');
  const [travelPace, setTravelPace] = useState<PaceValue>('moderate');
  const [budgetLevel, setBudgetLevel] = useState<BudgetValue>('medium');
  const [transportationMode, setTransportationMode] =
    useState<TransportValue>('walking');
  const [interests, setInterests] = useState<InterestValue[]>([
    'culture',
    'food',
  ]);
  const [optimizationIntent, setOptimizationIntent] =
    useState<CityDayIntent>('must_see');
  const [dayLength, setDayLength] = useState<DayLength>('half_day');
  const [effortLevel, setEffortLevel] = useState<EffortLevel>('moderate');
  const [avoidances, setAvoidances] = useState<Avoidance[]>([]);
  const [locationMode, setLocationMode] = useState<'current' | 'custom'>(
    'custom',
  );
  const [foodIntent, setFoodIntent] = useState<FoodIntent>('local_food');
  const [groupContext, setGroupContext] = useState<GroupContext>('solo');
  const [customLocation, setCustomLocation] = useState('');
  const [currentLocationName, setCurrentLocationName] = useState('Buscando...');
  const [coords, setCoords] = useState<Coordinates | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const router = useRouter();
  const currentIntent =
    CITY_DAY_INTENTS.find((option) => option.value === optimizationIntent) ??
    CITY_DAY_INTENTS[0];

  // Get current location on mount
  useEffect(() => {
    (async () => {
      const result = await getInitialLocation();
      setCurrentLocationName(result.label);

      if (result.coords) {
        setCoords(result.coords);
      } else {
        setLocationMode('custom');
      }
    })();
  }, []);

  const handleGenerate = async (tourPrompt: string) => {
    if (locationMode === 'current' && !coords) {
      showAlert(
        'Ubicación no disponible',
        'Elegí "Otra zona" para generar un plan con una referencia manual.',
      );
      return;
    }
    if (locationMode === 'custom' && !customLocation.trim()) {
      showAlert('Falta la zona', 'Ingresá una ciudad, barrio o área.');
      return;
    }

    setGenerating(true);

    try {
      const selectedFood =
        FOOD_OPTIONS.find((option) => option.value === foodIntent) ??
        FOOD_OPTIONS[0];
      const selectedGroup =
        GROUP_OPTIONS.find((option) => option.value === groupContext) ??
        GROUP_OPTIONS[0];
      const selectedIntent =
        CITY_DAY_INTENTS.find((option) => option.value === optimizationIntent) ??
        CITY_DAY_INTENTS[0];
      const selectedDayLength =
        DAY_LENGTH_OPTIONS.find((option) => option.value === dayLength) ??
        DAY_LENGTH_OPTIONS[1];
      const selectedEffort =
        EFFORT_OPTIONS.find((option) => option.value === effortLevel) ??
        EFFORT_OPTIONS[1];
      const selectedAvoidances = AVOIDANCE_OPTIONS.filter((option) =>
        avoidances.includes(option.value),
      );
      const startContext =
        locationMode === 'custom' && customLocation.trim()
          ? customLocation.trim()
          : currentLocationName;
      const effectiveInterests =
        foodIntent === 'none'
          ? interests.filter((value) => value !== 'food')
          : interests.includes('food')
            ? interests
            : [...interests, 'food'];

      // Unsupported future fields stay in prompt context until the Edge Function
      // formally accepts them as typed payload fields.
      let finalPrompt =
        tourPrompt.trim() ||
        `Planificá un City Day ${selectedIntent.label.toLowerCase()} desde ${startContext}.`;
      if (locationMode === 'custom' && customLocation.trim()) {
        finalPrompt = `${finalPrompt}. Punto de inicio o zona: ${customLocation.trim()}.`;
      }
      const avoidancesPrompt =
        selectedAvoidances.length > 0
          ? selectedAvoidances.map((option) => option.prompt).join(' ')
          : 'Sin evitaciones explícitas.';
      finalPrompt = `${finalPrompt} Brief de decisión del City Day: optimizar para "${selectedIntent.label}" (${selectedIntent.prompt}) ${selectedDayLength.prompt} Esfuerzo: ${selectedEffort.prompt} Comida o descanso: ${selectedFood.prompt} Grupo o condición: ${selectedGroup.prompt} Evitar: ${avoidancesPrompt}`;
      const shouldUseCurrentCoords = locationMode === 'current' && coords;
      const decisionBrief = {
        version: 1,
        startContext,
        locationMode,
        optimizationIntent,
        optimizationLabel: selectedIntent.label,
        optimizationDecision: selectedIntent.decision,
        dayLength,
        dayLengthLabel: selectedDayLength.label,
        dayLengthMinutes: selectedDayLength.minutes,
        effortLevel,
        effortLabel: selectedEffort.label,
        avoidances,
        avoidanceLabels: selectedAvoidances.map((option) => option.label),
        foodIntent,
        foodLabel: selectedFood.label,
        groupContext,
        groupLabel: selectedGroup.label,
        promptDetail: tourPrompt.trim() || null,
        assumptions: [
          'Los horarios, precios, reservas y disponibilidad son estimados hasta confirmación.',
          locationMode === 'custom'
            ? 'El punto de inicio manual puede requerir geocodificación o ajuste posterior.'
            : 'La ubicación actual depende del navegador o dispositivo.',
        ],
      };

      const tour = await generateTour({
        prompt: finalPrompt,
        destination: startContext,
        radius,
        days,
        vibe,
        budgetLevel,
        interests: effectiveInterests,
        transportationMode,
        travelPace,
        ...(selectedGroup.groupType && {
          groupType: selectedGroup.groupType,
        }),
        ...(shouldUseCurrentCoords && {
          latitude: coords.lat,
          longitude: coords.lng,
          destinationLatitude: coords.lat,
          destinationLongitude: coords.lng,
        }),
      });

      if (tour?.id) {
        const nextMetadata = {
          ...(tour.metadata || {}),
          decisionBrief,
          input: {
            ...(tour.metadata?.input || {}),
            decisionBrief,
            optimizationIntent,
            dayLength,
            effortLevel,
            avoidances,
            foodIntent,
            groupContext,
          },
        };
        try {
          await updateTourMetadata(tour.id, nextMetadata);
        } catch (metadataError) {
          console.error('Failed to persist City Day brief:', metadataError);
        }
        trackCityDayGenerated(tour.id, {
          days,
          radius,
          location_mode: locationMode,
          budget_level: budgetLevel,
          travel_pace: travelPace,
          food_intent: foodIntent,
          group_context: groupContext,
          optimization_intent: optimizationIntent,
          day_length: dayLength,
          effort_level: effortLevel,
          avoidances,
          brief_completed: true,
        });
        trackCityDaySaved(tour.id, {
          source: 'generation',
          auto_saved: true,
          optimization_intent: optimizationIntent,
        });
        router.replace(`/tour/${tour.id}`);
      } else {
        showAlert('¡Tour generado!', tour?.name || 'Tu tour fue creado', [
          {
            text: 'Ver tours',
            onPress: () => router.replace('/(tabs)/my-tours'),
          },
        ]);
      }
    } catch (err: any) {
      showAlert('Error', err.message || 'No se pudo generar el tour');
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
            <Text style={styles.title}>Brief del City Day</Text>
            <Text style={styles.subtitle}>
              Decile desde dónde salís, cuánto tiempo tenés y qué priorizar.
            </Text>
          </View>

          {/* Location Controls */}
          <View style={styles.settingsSection}>
            <Text style={styles.settingsTitle}>1. Punto de inicio</Text>
            <Text style={styles.sectionHint}>
              Hotel, barrio, dirección o ubicación actual.
            </Text>
            <View style={styles.locationTabs}>
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
                  Hotel / zona
                </Text>
              </TouchableOpacity>
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
                  Estoy acá ahora
                </Text>
              </TouchableOpacity>
            </View>

            {locationMode === 'custom' ? (
              <TextInput
                style={styles.locationInput}
                placeholder='Ej: hotel en Palermo, San Telmo, Roma Trastevere...'
                placeholderTextColor={colors.textMuted}
                value={customLocation}
                onChangeText={setCustomLocation}
                editable={!generating}
              />
            ) : (
              <View style={styles.currentLocationBadge}>
                <Text style={styles.currentLocationIcon}>📍</Text>
                <Text style={styles.currentLocationText}>
                  {currentLocationName}
                </Text>
              </View>
            )}
          </View>

          {/* Decision Intent */}
          <View style={styles.settingsSection}>
            <Text style={styles.settingsTitle}>2. Qué querés resolver</Text>
            <Text style={styles.sectionHint}>
              Elegí un criterio principal. El resto queda asumido.
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.intentRail}
            >
              {CITY_DAY_INTENTS.map((opt) => {
                const active = optimizationIntent === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.intentPill,
                      active && styles.intentPillActive,
                    ]}
                    onPress={() => setOptimizationIntent(opt.value)}
                    disabled={generating}
                    activeOpacity={0.75}
                  >
                    <Text
                      style={[
                        styles.intentLabel,
                        active && styles.intentLabelActive,
                      ]}
                    >
                      {opt.label}
                    </Text>
                    <Text style={styles.intentHint}>{opt.hint}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
            <Text style={styles.selectedIntentText}>
              Seleccionado: {currentIntent.label} · {currentIntent.hint}
            </Text>
          </View>

          {/* Time */}
          <View style={styles.settingsSection}>
            <Text style={styles.settingsTitle}>3. Cuánto tiempo tenés</Text>
            <View style={styles.segmentRow}>
              {DAY_LENGTH_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    styles.segmentChip,
                    dayLength === opt.value && styles.segmentChipActive,
                  ]}
                  onPress={() => setDayLength(opt.value)}
                  disabled={generating}
                  activeOpacity={0.75}
                >
                  <Text
                    style={[
                      styles.segmentChipText,
                      dayLength === opt.value && styles.segmentChipTextActive,
                    ]}
                  >
                    {opt.label}
                  </Text>
                  <Text style={styles.segmentChipHint}>{opt.hint}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Optional Detail */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>4. Detalle opcional</Text>
            <TextInput
              style={styles.textArea}
              placeholder='Ej: quiero cerrar con café, evitar museos muy largos o pasar por una librería...'
              placeholderTextColor={colors.textMuted}
              value={prompt}
              onChangeText={setPrompt}
              multiline
              numberOfLines={2}
              textAlignVertical='top'
              editable={!generating}
            />
          </View>

          <View style={styles.assumptionPanel}>
            <Text style={styles.assumptionText}>
              Zigzag asume: 1 día · a pie · ritmo balanceado · presupuesto
              medio · comida local · radio {formatRadius(radius)}
            </Text>
          </View>

          <TouchableOpacity
            style={styles.advancedToggle}
            onPress={() => setShowAdvanced((value) => !value)}
            activeOpacity={0.75}
          >
            <Text style={styles.advancedToggleText}>
              {showAdvanced ? 'Ocultar ajustes' : 'Ajustar más'}
            </Text>
            <Text style={styles.advancedToggleHint}>
              {showAdvanced
                ? 'Volver al brief corto'
                : 'Presupuesto, comida, transporte, evitaciones y radio'}
            </Text>
          </TouchableOpacity>

          {showAdvanced && (
            <View style={styles.advancedPanel}>
              {/* Day Count */}
              <View style={styles.settingsSectionCompact}>
                <Text style={styles.settingsTitle}>Días</Text>
                <View style={styles.segmentRow}>
                  {DAY_OPTIONS.map((opt) => (
                    <TouchableOpacity
                      key={opt}
                      style={[
                        styles.segmentChip,
                        days === opt && styles.segmentChipActive,
                      ]}
                      onPress={() => setDays(opt)}
                      disabled={generating}
                      activeOpacity={0.75}
                    >
                      <Text
                        style={[
                          styles.segmentChipText,
                          days === opt && styles.segmentChipTextActive,
                        ]}
                      >
                        {opt} {opt === 1 ? 'día' : 'días'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Time and Effort */}
              <View style={styles.settingsSectionCompact}>
                <Text style={styles.settingsTitle}>Esfuerzo</Text>
                <View style={styles.segmentRow}>
                  {EFFORT_OPTIONS.map((opt) => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[
                        styles.segmentChip,
                        effortLevel === opt.value && styles.segmentChipActive,
                      ]}
                      onPress={() => setEffortLevel(opt.value)}
                      disabled={generating}
                      activeOpacity={0.75}
                    >
                      <Text
                        style={[
                          styles.segmentChipText,
                          effortLevel === opt.value &&
                            styles.segmentChipTextActive,
                        ]}
                      >
                        {opt.label}
                      </Text>
                      <Text style={styles.segmentChipHint}>{opt.hint}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.controlLabel}>Evitar</Text>
                <View style={styles.wrapRow}>
                  {AVOIDANCE_OPTIONS.map((opt) => {
                    const active = avoidances.includes(opt.value);
                    return (
                      <TouchableOpacity
                        key={opt.value}
                        style={[
                          styles.filterChip,
                          active && styles.filterChipActive,
                        ]}
                        onPress={() =>
                          setAvoidances((prev) =>
                            active
                              ? prev.filter((value) => value !== opt.value)
                              : [...prev, opt.value],
                          )
                        }
                        disabled={generating}
                        activeOpacity={0.75}
                      >
                        <Text
                          style={[
                            styles.filterChipText,
                            active && styles.filterChipTextActive,
                          ]}
                        >
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Vibe Selector */}
              <View style={styles.settingsSectionCompact}>
                <Text style={styles.settingsTitle}>Vibra del Tour</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.vibeScrollContent}
                >
                  {VIBE_OPTIONS.map((opt) => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[
                        styles.vibeCard,
                        vibe === opt.value && styles.vibeCardActive,
                      ]}
                      onPress={() => setVibe(opt.value)}
                      disabled={generating}
                    >
                      <Text style={styles.vibeIcon}>{opt.icon}</Text>
                      <Text
                        style={[
                          styles.vibeLabel,
                          vibe === opt.value && styles.vibeLabelActive,
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Trip Fit */}
              <View style={styles.settingsSectionCompact}>
                <Text style={styles.settingsTitle}>Ajuste del plan</Text>

                <Text style={styles.controlLabel}>Ritmo</Text>
                <View style={styles.segmentRow}>
                  {PACE_OPTIONS.map((opt) => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[
                        styles.segmentChip,
                        travelPace === opt.value && styles.segmentChipActive,
                      ]}
                      onPress={() => setTravelPace(opt.value)}
                      disabled={generating}
                      activeOpacity={0.75}
                    >
                      <Text
                        style={[
                          styles.segmentChipText,
                          travelPace === opt.value &&
                            styles.segmentChipTextActive,
                        ]}
                      >
                        {opt.label}
                      </Text>
                      <Text style={styles.segmentChipHint}>{opt.hint}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.controlLabel}>Presupuesto</Text>
                <View style={styles.segmentRow}>
                  {BUDGET_OPTIONS.map((opt) => (
                    <TouchableOpacity
                      key={opt.value}
                      style={[
                        styles.segmentChip,
                        budgetLevel === opt.value && styles.segmentChipActive,
                      ]}
                      onPress={() => setBudgetLevel(opt.value)}
                      disabled={generating}
                      activeOpacity={0.75}
                    >
                      <Text
                        style={[
                          styles.segmentChipText,
                          budgetLevel === opt.value &&
                            styles.segmentChipTextActive,
                        ]}
                      >
                        {opt.label}
                      </Text>
                      <Text style={styles.segmentChipHint}>{opt.hint}</Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.controlLabel}>Intereses</Text>
                <View style={styles.wrapRow}>
                  {INTEREST_OPTIONS.map((opt) => {
                    const active = interests.includes(opt.value);
                    return (
                      <TouchableOpacity
                        key={opt.value}
                        style={[
                          styles.filterChip,
                          active && styles.filterChipActive,
                        ]}
                        onPress={() =>
                          setInterests((prev) =>
                            active
                              ? prev.filter((value) => value !== opt.value)
                              : [...prev, opt.value],
                          )
                        }
                        disabled={generating}
                        activeOpacity={0.75}
                      >
                        <Text
                          style={[
                            styles.filterChipText,
                            active && styles.filterChipTextActive,
                          ]}
                        >
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={styles.controlLabel}>Cómo moverse</Text>
                <View style={styles.wrapRow}>
                  {TRANSPORT_OPTIONS.map((opt) => {
                    const active = transportationMode === opt.value;
                    return (
                      <TouchableOpacity
                        key={opt.value}
                        style={[
                          styles.filterChip,
                          active && styles.filterChipActive,
                        ]}
                        onPress={() => setTransportationMode(opt.value)}
                        disabled={generating}
                        activeOpacity={0.75}
                      >
                        <Text
                          style={[
                            styles.filterChipText,
                            active && styles.filterChipTextActive,
                          ]}
                        >
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={styles.controlLabel}>Comida</Text>
                <View style={styles.wrapRow}>
                  {FOOD_OPTIONS.map((opt) => {
                    const active = foodIntent === opt.value;
                    return (
                      <TouchableOpacity
                        key={opt.value}
                        style={[
                          styles.filterChip,
                          active && styles.filterChipActive,
                        ]}
                        onPress={() => setFoodIntent(opt.value)}
                        disabled={generating}
                        activeOpacity={0.75}
                      >
                        <Text
                          style={[
                            styles.filterChipText,
                            active && styles.filterChipTextActive,
                          ]}
                        >
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={styles.controlLabel}>Grupo / condición</Text>
                <View style={styles.wrapRow}>
                  {GROUP_OPTIONS.map((opt) => {
                    const active = groupContext === opt.value;
                    return (
                      <TouchableOpacity
                        key={opt.value}
                        style={[
                          styles.filterChip,
                          active && styles.filterChipActive,
                        ]}
                        onPress={() => setGroupContext(opt.value)}
                        disabled={generating}
                        activeOpacity={0.75}
                      >
                        <Text
                          style={[
                            styles.filterChipText,
                            active && styles.filterChipTextActive,
                          ]}
                        >
                          {opt.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={styles.estimateNote}>
                  Estos controles refinan el City Day. Food intent y ritmo
                  suave viajan como contexto del prompt hasta que el backend
                  tenga campos dedicados.
                </Text>
              </View>

              {/* Radius Slider */}
              <View style={styles.settingsSectionCompact}>
                <View style={styles.radiusHeader}>
                  <Text style={styles.settingsTitle}>Radio de búsqueda</Text>
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
              <View style={styles.quickSectionCompact}>
                <Text style={styles.quickLabel}>Atajos de detalle</Text>
                <View style={styles.quickGrid}>
                  {QUICK_PROMPTS.map((qp, i) => (
                    <TouchableOpacity
                      key={i}
                      style={styles.quickChip}
                      onPress={() => setPrompt(qp.prompt)}
                      disabled={generating}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.quickChipText}>{qp.label}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </View>
          )}

          {/* Generate Button */}
          <TouchableOpacity
            style={[styles.generateButton, generating && styles.buttonDisabled]}
            onPress={() => handleGenerate(prompt)}
            disabled={generating}
            activeOpacity={0.8}
          >
            {generating ? (
              <View style={styles.generatingState}>
                <ActivityIndicator color={colors.background} />
                <Text style={styles.generatingText}>
                  Generando tu City Day...
                </Text>
              </View>
            ) : (
              <Text style={styles.generateText}>Resolver mi City Day</Text>
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
    paddingBottom: spacing.md,
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
    paddingVertical: spacing.sm,
    fontSize: 15,
    color: colors.text,
    minHeight: 52,
  },
  // Settings
  settingsSection: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  settingsSectionCompact: {
    gap: spacing.sm,
  },
  settingsTitle: {
    ...typography.headline,
    fontSize: 15,
  },
  sectionHint: {
    ...typography.caption,
    lineHeight: 18,
  },
  assumptionPanel: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  assumptionTitle: {
    ...typography.label,
    color: colors.textSecondary,
    letterSpacing: 0,
  },
  assumptionText: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  advancedToggle: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.sm,
    minHeight: 44,
    justifyContent: 'center',
    borderRadius: radii.lg,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  advancedToggleText: {
    ...typography.caption,
    color: colors.primary,
    fontSize: 15,
    fontWeight: '800',
  },
  advancedToggleHint: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  advancedPanel: {
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.lg,
  },
  controlLabel: {
    ...typography.label,
    marginTop: spacing.sm,
  },
  intentGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  intentRail: {
    gap: spacing.sm,
    paddingRight: spacing.lg,
  },
  intentPill: {
    width: 150,
    minHeight: 48,
    justifyContent: 'center',
    gap: 2,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  intentPillActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  intentCard: {
    width: '48%',
    minHeight: 72,
    justifyContent: 'center',
    gap: 4,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  intentCardActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  intentLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 14,
    fontWeight: '800',
  },
  intentLabelActive: {
    color: colors.primary,
  },
  intentHint: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 11,
    lineHeight: 15,
  },
  selectedIntentText: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 17,
  },
  segmentRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  segmentChip: {
    flex: 1,
    minHeight: 52,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 2,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
  },
  segmentChipActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  segmentChipText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  segmentChipTextActive: {
    color: colors.primary,
  },
  segmentChipHint: {
    ...typography.caption,
    fontSize: 10,
    textAlign: 'center',
  },
  wrapRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  filterChip: {
    minHeight: 36,
    justifyContent: 'center',
    borderRadius: radii.full,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  filterChipActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  filterChipText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  filterChipTextActive: {
    color: colors.primary,
  },
  estimateNote: {
    ...typography.caption,
    lineHeight: 18,
    marginTop: spacing.xs,
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
  // Vibe Selector
  vibeScrollContent: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  vibeCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.md,
    alignItems: 'center',
    minWidth: 90,
    gap: spacing.xs,
  },
  vibeCardActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  vibeIcon: {
    fontSize: 24,
  },
  vibeLabel: {
    ...typography.caption,
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  vibeLabelActive: {
    color: colors.primary,
    fontWeight: '700',
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
  quickSectionCompact: {
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
    paddingVertical: 16,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
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
