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
import {
  fetchTourById,
  updateTourMetadata,
  type Tour,
} from '../../api/tours';
import { colors, typography, spacing, radii } from '../../constants/theme';
import {
  ZigzagMap,
  ZigzagMarker,
  type ZigzagRegion,
} from '../../components/ZigzagMap';
import { showAlert } from '../../utils/alerts';
import {
  trackCityDayAdjusted,
  trackCityDayShared,
  trackCityDayViewed,
  trackPremiumInterestClicked,
} from '../../lib/analytics';
import { useAuth } from '../../contexts/AuthProvider';
import {
  getAvoidanceLabel,
  getCityDayIntent,
  getDayLength,
  getEffortLevel,
} from '../../constants/cityDay';

type TourActivity = NonNullable<Tour['activities']>[number];
type AdjustmentStatus = 'preview' | 'local' | 'pending' | 'alternative';
type AdjustmentPreview = {
  id: string;
  title: string;
  status: AdjustmentStatus;
  body: string;
  changes: string[];
  actionLabel?: string;
  stopKey?: string;
};

const TRANSPORT_ICONS: Record<string, string> = {
  walk: '🚶',
  walking: '🚶',
  bus: '🚌',
  subway: '🚇',
  taxi: '🚕',
  cycle: '🚲',
  cycling: '🚲',
  bike: '🚲',
  drive: '🚗',
  driving: '🚗',
  transit: '🚌',
  public_transport: '🚌',
  none: '📍',
};

const TRANSPORT_LABELS: Record<string, string> = {
  walk: 'a pie',
  walking: 'a pie',
  bike: 'en bici',
  cycle: 'en bici',
  cycling: 'en bici',
  drive: 'en auto',
  driving: 'en auto',
  bus: 'en bus',
  subway: 'en subte',
  taxi: 'en taxi',
  transit: 'en transporte',
  public_transport: 'en transporte',
  none: 'siguiente parada',
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

const PACE_LABELS: Record<string, string> = {
  relaxed: 'ritmo relajado',
  moderate: 'ritmo balanceado',
  fast: 'ritmo intenso',
};

const BUDGET_LABELS: Record<string, string> = {
  low: 'presupuesto bajo',
  medium: 'presupuesto medio',
  high: 'presupuesto alto',
};

const GROUP_LABELS: Record<string, string> = {
  solo: 'solo',
  couple: 'pareja',
  family: 'familia',
  friends: 'amigos',
};

const COCKPIT_ACTIONS = [
  { id: 'change_pace', label: 'Cambiar ritmo', kind: 'preview' },
  { id: 'add_food', label: 'Agregar comida', kind: 'alternative' },
  { id: 'change_start', label: 'Cambiar inicio', kind: 'pending' },
  { id: 'shorter_route', label: 'Ruta más corta', kind: 'preview' },
  { id: 'cheaper_route', label: 'Más barato', kind: 'preview' },
  { id: 'share', label: 'Compartir', kind: 'share' },
  { id: 'premium', label: 'Organizar más', kind: 'premium' },
] as const;

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

function formatTransport(mode: string): string {
  return TRANSPORT_LABELS[mode] || mode;
}

function formatDistance(meters?: number): string | null {
  if (!meters || meters <= 0) return null;
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

function getActivityKey(activity: TourActivity, index: number): string {
  return `${activity.dayNumber || 1}-${activity.order || index}`;
}

function getActivityName(activity: TourActivity): string {
  return activity.activityName || activity.activity?.name || 'Parada';
}

function getActivityDescription(activity: TourActivity): string {
  return activity.notes || activity.activityData?.description || '';
}

function getActivityDuration(activity: TourActivity): number {
  return (
    activity.activityData?.duration ||
    activity.duration ||
    activity.activity?.duration ||
    0
  );
}

function getActivityCoordinate(activity: TourActivity) {
  const latitude = activity.activityLatitude ?? activity.activity?.latitude;
  const longitude = activity.activityLongitude ?? activity.activity?.longitude;
  if (typeof latitude !== 'number' || typeof longitude !== 'number') return null;
  return { latitude, longitude };
}

function getInitialRegion(points: { latitude: number; longitude: number }[]) {
  const first = points[0];
  if (!first) return undefined;

  const latitudes = points.map((point) => point.latitude);
  const longitudes = points.map((point) => point.longitude);
  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLng = Math.min(...longitudes);
  const maxLng = Math.max(...longitudes);

  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max(0.015, (maxLat - minLat) * 1.6),
    longitudeDelta: Math.max(0.015, (maxLng - minLng) * 1.6),
  } satisfies ZigzagRegion;
}

function getStopReason(activity: TourActivity, tour: Tour): string {
  const explicitReason = activity.activityData?.whyThisStop;
  if (explicitReason) return explicitReason;

  const input = tour.metadata?.input || {};
  const interestText = Array.isArray(input.interests) && input.interests.length > 0
    ? input.interests.join(', ')
    : null;
  const paceText =
    typeof input.travelPace === 'string' ? PACE_LABELS[input.travelPace] : null;
  const budgetText =
    typeof input.budgetLevel === 'string'
      ? BUDGET_LABELS[input.budgetLevel]
      : null;
  const type = activity.activityType || activity.activity?.type;
  const reasonParts = [
    interestText ? `intereses: ${interestText}` : null,
    paceText,
    budgetText,
    type === 'eat' || type === 'cafe' ? 'pausa de comida' : null,
  ].filter(Boolean);

  return reasonParts.length > 0
    ? `Encaja con ${reasonParts.join(' · ')}.`
    : 'Encaja como parada dentro del orden estimado del City Day.';
}

function getPracticalRows(
  activity: TourActivity,
  duration: number,
  isLast: boolean,
) {
  const price = activity.activity?.price;
  const source = activity.activityData?.source;
  return [
    {
      label: 'Duración',
      value: duration > 0 ? `${formatDuration(duration)} est.` : 'Desconocida',
      status: duration > 0 ? 'estimado' : 'desconocido',
    },
    {
      label: 'A siguiente',
      value: isLast
        ? 'Última parada'
        : activity.travelTimeToNext
          ? `${activity.travelTimeToNext} min est.`
          : 'Por confirmar',
      status: isLast ? 'final' : activity.travelTimeToNext ? 'estimado' : 'desconocido',
    },
    {
      label: 'Costo',
      value: typeof price === 'number' && price > 0 ? `$${price} est.` : 'Por confirmar',
      status: typeof price === 'number' && price > 0 ? 'estimado' : 'desconocido',
    },
    {
      label: 'Horario',
      value: activity.activityData?.openingHours || 'Por confirmar',
      status: activity.activityData?.openingHours ? 'estimado' : 'desconocido',
    },
    {
      label: 'Reserva',
      value: activity.activityData?.reservationStatus || 'Por confirmar',
      status: activity.activityData?.reservationStatus ? 'estimado' : 'desconocido',
    },
    {
      label: 'Fuente',
      value: source || 'AI estimada',
      status: source ? 'fuente' : 'estimado',
    },
  ];
}

function buildRouteContextItems(input: Record<string, any>) {
  const decisionBrief = input.decisionBrief || {};
  const transportValue = Array.isArray(input.transportationMode)
    ? input.transportationMode[0]
    : input.transportationMode;
  const interests = Array.isArray(input.interests)
    ? input.interests.join(', ')
    : null;

  return [
    input.destination ? `Inicio: ${input.destination}` : null,
    typeof input.radius === 'number'
      ? `Radio: ${formatDistance(input.radius) || `${input.radius} m`}`
      : null,
    typeof input.travelPace === 'string'
      ? PACE_LABELS[input.travelPace] || input.travelPace
      : null,
    typeof input.budgetLevel === 'string'
      ? BUDGET_LABELS[input.budgetLevel] || input.budgetLevel
      : null,
    typeof transportValue === 'string'
      ? `Moverse: ${formatTransport(transportValue)}`
      : null,
    typeof input.groupType === 'string'
      ? `Grupo: ${GROUP_LABELS[input.groupType] || input.groupType}`
      : null,
    typeof input.optimizationIntent === 'string'
      ? `Optimiza: ${getCityDayIntent(input.optimizationIntent).label}`
      : typeof decisionBrief.optimizationIntent === 'string'
        ? `Optimiza: ${getCityDayIntent(decisionBrief.optimizationIntent).label}`
        : null,
    typeof decisionBrief.dayLength === 'string'
      ? `Tiempo: ${getDayLength(decisionBrief.dayLength).label}`
      : null,
    interests ? `Intereses: ${interests}` : null,
  ].filter((item): item is string => Boolean(item));
}

function getDecisionBrief(tour: Tour) {
  const input = tour.metadata?.input || {};
  return tour.metadata?.decisionBrief || input.decisionBrief || {};
}

function buildDecisionSummary({
  tour,
  activities,
  totalDuration,
  routeDistance,
  budgetLabel,
}: {
  tour: Tour;
  activities: TourActivity[];
  totalDuration: number;
  routeDistance: string | null;
  budgetLabel: string;
}) {
  const input = tour.metadata?.input || {};
  const brief = getDecisionBrief(tour);
  const intent = getCityDayIntent(
    brief.optimizationIntent || input.optimizationIntent,
  );
  const dayLength = getDayLength(brief.dayLength);
  const effort = getEffortLevel(brief.effortLevel);
  const startContext =
    brief.startContext || input.destination || 'punto de inicio asumido';
  const stopCount = activities.length;
  const avoidances = Array.isArray(brief.avoidances)
    ? brief.avoidances.map(getAvoidanceLabel)
    : [];
  const foodStop = activities.find((activity) => {
    const type = activity.activityType || activity.activity?.type || '';
    return ['eat', 'cafe'].includes(type);
  });
  const distanceText = routeDistance || 'distancia por estimar';
  const durationText =
    totalDuration > 0
      ? `${formatDuration(totalDuration)} estimados`
      : `${dayLength.label} disponibles asumidos`;

  const decisions = [
    `Empieza en ${startContext} para que el plan sea ejecutable desde tu contexto real.`,
    `Ordena ${stopCount || 'las'} paradas alrededor de ${intent.label.toLowerCase()}: ${intent.decision}.`,
    foodStop
      ? `Ubica comida o descanso en ${getActivityName(foodStop)} para que no sea un agregado tardío.`
      : `Mantiene comida o descanso como supuesto editable: ${brief.foodLabel || 'sin preferencia fuerte'}.`,
    avoidances.length > 0
      ? `Evita o reduce: ${avoidances.join(', ')}.`
      : `No hay evitaciones explícitas, así que Zigzag prioriza orden y valor del recorrido.`,
  ];

  const tradeoffs = [
    `${durationText} · ${distanceText} · ${budgetLabel}.`,
    `Esfuerzo ${effort.label.toLowerCase()} y tiempo ${dayLength.label}; si esto no encaja, ajustá ritmo o ruta corta.`,
  ];

  const uncertainty = [
    'Horarios, reservas, precios y disponibilidad requieren confirmación.',
    routeDistance
      ? 'La distancia total es estimada por los datos disponibles.'
      : 'La distancia total todavía no está confirmada.',
  ];

  return {
    intent,
    startContext,
    durationText,
    distanceText,
    budgetLabel,
    stopCount,
    decisions,
    tradeoffs,
    uncertainty,
  };
}

export default function TourDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();
  const [tour, setTour] = useState<Tour | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removedStopKeys, setRemovedStopKeys] = useState<string[]>([]);
  const [adjustmentPreview, setAdjustmentPreview] =
    useState<AdjustmentPreview | null>(null);

  useEffect(() => {
    if (!id) return;
    setRemovedStopKeys([]);
    fetchTourById(id)
      .then((data) => setTour(data as Tour))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!tour?.id) return;
    trackCityDayViewed(tour.id, {
      stops: tour.activities?.length ?? 0,
      source: 'tour_detail',
    });
  }, [tour?.id, tour?.activities?.length]);

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
    (a, b) =>
      (a.dayNumber || 1) - (b.dayNumber || 1) ||
      (a.order || 0) - (b.order || 0),
  ).filter((activity, index) => !removedStopKeys.includes(getActivityKey(activity, index)));
  const allActivitiesCount = tour.activities?.length || 0;
  const mapPoints = activities
    .map((activity, index) => {
      const coordinate = getActivityCoordinate(activity);
      if (!coordinate) return null;
      return {
        ...coordinate,
        key: getActivityKey(activity, index),
        name: getActivityName(activity),
        order: index + 1,
      };
    })
    .filter(
      (
        point,
      ): point is {
        latitude: number;
        longitude: number;
        key: string;
        name: string;
        order: number;
      } => Boolean(point),
    );
  const missingCoordinateCount = Math.max(0, activities.length - mapPoints.length);
  const initialMapRegion = getInitialRegion(mapPoints);

  const totalDuration = activities.reduce(
    (sum, a) =>
      sum +
      (a.activity?.duration || a.activityData?.duration || a.duration || 0),
    0,
  );
  const confidence = tour.metadata?.confidence;
  const shouldShowEstimateNotice =
    Boolean(confidence) ||
    activities.some(
      (activity) => activity.travelTimeToNext || activity.duration,
    );
  const input = tour.metadata?.input || {};
  const routeDistance = formatDistance(tour.totalDistance);
  const budgetLabel =
    typeof input.budgetLevel === 'string'
      ? BUDGET_LABELS[input.budgetLevel] || input.budgetLevel
      : 'presupuesto estimado';
  const routeContextItems = buildRouteContextItems(input);
  const canPersistAdjustments = Boolean(tour.userId && user?.id === tour.userId);
  const decisionSummary = buildDecisionSummary({
    tour,
    activities,
    totalDuration,
    routeDistance,
    budgetLabel,
  });

  const persistTourAdjustment = async (
    adjustment: Record<string, unknown>,
  ): Promise<boolean> => {
    const existingAdjustments = Array.isArray(
      tour.metadata?.cityDayAdjustments?.actions,
    )
      ? tour.metadata.cityDayAdjustments.actions
      : [];
    const nextMetadata = {
      ...(tour.metadata || {}),
      cityDayAdjustments: {
        ...(tour.metadata?.cityDayAdjustments || {}),
        updatedAt: new Date().toISOString(),
        actions: [
          ...existingAdjustments,
          {
            ...adjustment,
            createdAt: new Date().toISOString(),
          },
        ],
      },
    };

    setTour((current) =>
      current ? { ...current, metadata: nextMetadata } : current,
    );

    if (!canPersistAdjustments) return false;

    try {
      await updateTourMetadata(tour.id, nextMetadata);
      return true;
    } catch (err) {
      console.error('Failed to persist tour adjustment:', err);
      return false;
    }
  };

  const showAdjustmentPreview = (preview: AdjustmentPreview) => {
    setAdjustmentPreview(preview);
    trackCityDayAdjusted(tour.id, preview.id, {
      source: 'tour_detail_cockpit',
      adjustment_status: preview.status,
      preview_change_count: preview.changes.length,
    });
    void persistTourAdjustment({
      type: 'adjustment_preview',
      preview,
      source: 'tour_detail_cockpit',
    });
  };

  const buildActionPreview = (
    action: (typeof COCKPIT_ACTIONS)[number],
  ): AdjustmentPreview => {
    const lastStop = activities[activities.length - 1];
    const lastStopKey = lastStop
      ? getActivityKey(lastStop, activities.length - 1)
      : undefined;
    const lastStopName = lastStop ? getActivityName(lastStop) : 'la última parada';

    if (action.id === 'shorter_route') {
      return {
        id: action.id,
        title: 'Preview: ruta más corta',
        status: activities.length > 2 ? 'preview' : 'pending',
        body:
          activities.length > 2
            ? 'Zigzag puede probar una vista local más corta quitando la parada menos crítica del final.'
            : 'Esta ruta ya es corta; la próxima pasada puede pedir una regeneración más compacta.',
        changes:
          activities.length > 2
            ? [
                `Ocultar ${lastStopName} en esta vista.`,
                'Recalcular visualmente cantidad de paradas y duración estimada.',
                'Guardar el ajuste como preview para regeneración futura.',
              ]
            : [
                'Mantener la ruta actual y registrar que el usuario pidió una versión más corta.',
              ],
        actionLabel: activities.length > 2 ? 'Aplicar vista local' : undefined,
        stopKey: activities.length > 2 ? lastStopKey : undefined,
      };
    }

    if (action.id === 'cheaper_route') {
      return {
        id: action.id,
        title: 'Preview: cuidar presupuesto',
        status: 'preview',
        body:
          'La vista barata prioriza paradas gratuitas o por confirmar antes de depender de entradas costosas.',
        changes: [
          'Marcar costos desconocidos como datos a confirmar.',
          'Priorizar alternativas gratuitas o de bajo compromiso cuando existan.',
          'Guardar la preferencia para una regeneración futura más barata.',
        ],
      };
    }

    if (action.id === 'change_pace') {
      return {
        id: action.id,
        title: 'Preview: cambiar ritmo',
        status: 'preview',
        body:
          'Cambiar el ritmo ajusta cuántas paradas conviene sostener y dónde agregar descanso.',
        changes: [
          'Ritmo tranquilo: menos paradas y más margen.',
          'Ritmo intenso: conservar más paradas si el esfuerzo es aceptable.',
          'La próxima regeneración puede usar esta preferencia sin rehacer el brief.',
        ],
      };
    }

    if (action.id === 'add_food') {
      return {
        id: action.id,
        title: 'Alternativas: comida o descanso',
        status: 'alternative',
        body:
          'Zigzag puede tratar comida y descanso como parte del recorrido, no como dato decorativo.',
        changes: [
          'Insertar pausa de café si el recorrido queda denso.',
          'Mover comida cerca del punto medio del día.',
          'Priorizar bajo costo, vegetariano o local según el brief guardado.',
        ],
      };
    }

    return {
      id: action.id,
      title: 'Pendiente: cambiar inicio',
      status: 'pending',
      body:
        'Cambiar el inicio requiere regeneración parcial para reordenar el recorrido con honestidad.',
      changes: [
        'Registrar nuevo punto de inicio deseado.',
        'Reordenar paradas según distancia y tiempo.',
        'Mantener la ruta actual visible hasta confirmar la nueva versión.',
      ],
    };
  };

  const applyAdjustmentPreview = () => {
    if (!adjustmentPreview) return;

    if (adjustmentPreview.id === 'shorter_route' && adjustmentPreview.stopKey) {
      setRemovedStopKeys((prev) =>
        prev.includes(adjustmentPreview.stopKey!)
          ? prev
          : [...prev, adjustmentPreview.stopKey!],
      );
      void persistTourAdjustment({
        type: 'apply_adjustment_preview',
        previewId: adjustmentPreview.id,
        stopKey: adjustmentPreview.stopKey,
        source: 'tour_detail_cockpit',
      });
      setAdjustmentPreview({
        ...adjustmentPreview,
        status: 'local',
        title: 'Aplicado en esta vista',
        body: 'La parada se ocultó localmente y el ajuste quedó registrado para una futura regeneración.',
        actionLabel: undefined,
      });
      return;
    }

    void persistTourAdjustment({
      type: 'acknowledge_adjustment_preview',
      previewId: adjustmentPreview.id,
      source: 'tour_detail_cockpit',
    });
  };

  const removeStop = (key: string, name: string) => {
    setRemovedStopKeys((prev) => (prev.includes(key) ? prev : [...prev, key]));
    trackCityDayAdjusted(tour.id, 'remove_stop', {
      source: 'tour_detail_stop',
      stop_name: name,
      adjustment_status: canPersistAdjustments ? 'persisted' : 'local_only',
    });
    void persistTourAdjustment({
      type: 'remove_stop',
      stopKey: key,
      stopName: name,
      source: 'tour_detail_stop',
    });
    setAdjustmentPreview({
      id: 'remove_stop',
      title: 'Parada quitada',
      status: canPersistAdjustments ? 'local' : 'pending',
      body: canPersistAdjustments
        ? `${name} se ocultó y el ajuste quedó serializado en la metadata del tour.`
        : `${name} se ocultó de esta vista local. Solo se persisten ajustes en tours propios.`,
      changes: [
        'La timeline se actualiza en esta vista.',
        canPersistAdjustments
          ? 'El ajuste queda disponible para continuar desde el plan guardado.'
          : 'La persistencia requiere abrir un tour propio.',
      ],
    });
  };

  const handleCockpitAction = (action: (typeof COCKPIT_ACTIONS)[number]) => {
    if (action.kind === 'share') {
      trackCityDayShared(tour.id, {
        source: 'tour_detail_cockpit',
        optimization_intent: decisionSummary.intent.value,
        adjustment_preview_id: adjustmentPreview?.id || null,
      });
      showAlert(
        'Compartir ruta',
        'La acción de compartir queda medida para validar valor. La próxima pasada conectará el share real.',
      );
      return;
    }

    if (action.kind === 'premium') {
      trackPremiumInterestClicked('tour_detail_cockpit', {
        tour_id: tour.id,
        optimization_intent: decisionSummary.intent.value,
        adjustment_preview_id: adjustmentPreview?.id || null,
      });
      showAlert(
        'Interés registrado',
        'Organizar, comparar y reutilizar rutas queda como señal premium futura, después de ver valor.',
      );
      return;
    }

    showAdjustmentPreview(buildActionPreview(action));
  };

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

          {shouldShowEstimateNotice && (
            <View style={styles.estimateBanner}>
              <Text style={styles.estimateTitle}>Datos estimados</Text>
              <Text style={styles.estimateText}>
                Los tiempos, precios, horarios, reservas y disponibilidad no
                están garantizados. Confirmá los detalles antes de salir.
              </Text>
            </View>
          )}

          <View style={styles.decisionPanel}>
            <Text style={styles.decisionEyebrow}>Tu día, resuelto</Text>
            <Text style={styles.decisionTitle}>
              Optimizado para {decisionSummary.intent.label.toLowerCase()}
            </Text>
            <Text style={styles.decisionText}>
              {decisionSummary.stopCount || 'Sin'} paradas ·{' '}
              {decisionSummary.durationText} · {decisionSummary.distanceText}
            </Text>

            <View style={styles.decisionMetaRow}>
              <View style={styles.decisionMetaItem}>
                <Text style={styles.decisionMetaLabel}>Inicio</Text>
                <Text style={styles.decisionMetaValue}>
                  {decisionSummary.startContext}
                </Text>
              </View>
              <View style={styles.decisionMetaItem}>
                <Text style={styles.decisionMetaLabel}>Presupuesto</Text>
                <Text style={styles.decisionMetaValue}>
                  {decisionSummary.budgetLabel}
                </Text>
              </View>
            </View>

            <Text style={styles.decisionSectionLabel}>Zigzag decidió</Text>
            {decisionSummary.decisions.map((decision) => (
              <View key={decision} style={styles.decisionBulletRow}>
                <Text style={styles.decisionBullet}>•</Text>
                <Text style={styles.decisionBulletText}>{decision}</Text>
              </View>
            ))}

            <Text style={styles.decisionSectionLabel}>Tradeoffs</Text>
            {decisionSummary.tradeoffs.map((tradeoff) => (
              <Text key={tradeoff} style={styles.tradeoffText}>
                {tradeoff}
              </Text>
            ))}

            <View style={styles.uncertaintyBox}>
              <Text style={styles.uncertaintyTitle}>A confirmar</Text>
              {decisionSummary.uncertainty.map((item) => (
                <Text key={item} style={styles.uncertaintyText}>
                  {item}
                </Text>
              ))}
            </View>
          </View>

          <View style={styles.routeSummaryGrid}>
            <View style={styles.routeSummaryItem}>
              <Text style={styles.routeSummaryLabel}>Esfuerzo</Text>
              <Text style={styles.routeSummaryValue}>
                {routeDistance || 'Por estimar'}
              </Text>
            </View>
            <View style={styles.routeSummaryItem}>
              <Text style={styles.routeSummaryLabel}>Presupuesto</Text>
              <Text style={styles.routeSummaryValue}>{budgetLabel}</Text>
            </View>
          </View>

          <View style={styles.cockpitPanel}>
            <Text style={styles.cockpitTitle}>Ajustar este City Day</Text>
            <Text style={styles.cockpitText}>
              La ruta es un primer plan editable. Cada acción muestra qué
              cambiaría, qué queda local y qué necesita regeneración futura.
            </Text>
            <View style={styles.cockpitActions}>
              {COCKPIT_ACTIONS.map((action) => (
                <TouchableOpacity
                  key={action.label}
                  style={styles.cockpitChip}
                  onPress={() => handleCockpitAction(action)}
                  activeOpacity={0.75}
                >
                  <Text style={styles.cockpitChipText}>{action.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {adjustmentPreview && (
              <View style={styles.previewPanel}>
                <View style={styles.previewHeader}>
                  <Text style={styles.previewTitle}>
                    {adjustmentPreview.title}
                  </Text>
                  <Text style={styles.previewStatus}>
                    {adjustmentPreview.status}
                  </Text>
                </View>
                <Text style={styles.previewBody}>{adjustmentPreview.body}</Text>
                {adjustmentPreview.changes.map((change) => (
                  <View key={change} style={styles.previewChangeRow}>
                    <Text style={styles.previewChangeDot}>•</Text>
                    <Text style={styles.previewChangeText}>{change}</Text>
                  </View>
                ))}
                {adjustmentPreview.actionLabel && (
                  <TouchableOpacity
                    style={styles.previewApplyButton}
                    onPress={applyAdjustmentPreview}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.previewApplyText}>
                      {adjustmentPreview.actionLabel}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>

          {routeContextItems.length > 0 && (
            <View style={styles.contextPanel}>
              <Text style={styles.contextTitle}>Contexto guardado</Text>
              <View style={styles.contextChips}>
                {routeContextItems.map((item) => (
                  <View key={item} style={styles.contextChip}>
                    <Text style={styles.contextChipText}>{item}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

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

        <View style={styles.mapSection}>
          <Text style={styles.sectionTitle}>Mapa del recorrido</Text>
          {initialMapRegion ? (
            <>
              <ZigzagMap
                style={styles.routeMap}
                initialRegion={initialMapRegion}
                userInterfaceStyle='dark'
                mapType='mutedStandard'
              >
                {mapPoints.map((point) => (
                  <ZigzagMarker
                    key={point.key}
                    coordinate={{
                      latitude: point.latitude,
                      longitude: point.longitude,
                    }}
                    title={`${point.order}. ${point.name}`}
                    pinColor={colors.primary}
                  />
                ))}
              </ZigzagMap>
              <View style={styles.mapStopList}>
                {mapPoints.map((point) => (
                  <View key={point.key} style={styles.mapStopPill}>
                    <Text style={styles.mapStopNumber}>{point.order}</Text>
                    <Text style={styles.mapStopName}>{point.name}</Text>
                  </View>
                ))}
              </View>
            </>
          ) : (
            <View style={styles.mapFallback}>
              <Text style={styles.mapFallbackTitle}>Mapa no disponible</Text>
              <Text style={styles.mapFallbackText}>
                Esta ruta no trae coordenadas suficientes, pero la timeline
                sigue siendo usable.
              </Text>
            </View>
          )}
          {missingCoordinateCount > 0 && (
            <Text style={styles.mapNotice}>
              {missingCoordinateCount} de {activities.length} paradas no tienen
              coordenadas confiables para ubicar en el mapa.
            </Text>
          )}
        </View>

        {/* Timeline */}
        <View style={styles.timeline}>
          <Text style={styles.sectionTitle}>Itinerario</Text>
          {activities.length === 0 ? (
            <View style={styles.emptyItinerary}>
              <Text style={styles.emptyTitle}>No se guardaron paradas</Text>
              <Text style={styles.emptyText}>
                {allActivitiesCount > 0
                  ? 'Quitaste todas las paradas en esta vista local. Podés volver atrás o generar un City Day con otros datos.'
                  : 'Este tour no tiene actividades disponibles. Podés volver a generar un City Day con otros datos.'}
              </Text>
              <TouchableOpacity
                style={styles.generateLink}
                onPress={() => router.push('/generate')}
              >
                <Text style={styles.generateLinkText}>Plan A City Day</Text>
              </TouchableOpacity>
            </View>
          ) : (
            activities.map((act, index) => {
            const actType =
              act.activityType || act.activity?.type || 'visit';
            const actName = getActivityName(act);
            const actDesc = getActivityDescription(act);
            const actions = act.actions || [];
            const duration = getActivityDuration(act);
            const transport = act.transportMode || 'walk';
            const isLast = index === activities.length - 1;
            const currentDay = act.dayNumber || 1;
            const previousDay =
              index > 0 ? activities[index - 1]?.dayNumber || 1 : null;
            const showDayHeader = index === 0 || currentDay !== previousDay;
            const stopKey = getActivityKey(act, index);
            const practicalRows = getPracticalRows(act, duration, isLast);
            const distanceToNext = formatDistance(act.distanceToNext);

            return (
              <View key={`${currentDay}-${act.order || index}`}>
                {showDayHeader && (
                  <Text style={styles.dayHeading}>Día {currentDay}</Text>
                )}
                <View style={styles.timelineItem}>
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
                          {formatDuration(duration)} est.
                        </Text>
                      )}
                    </View>
                    {actDesc ? (
                      <Text style={styles.timelineDesc}>{actDesc}</Text>
                    ) : null}

                    <View style={styles.reasonBox}>
                      <Text style={styles.reasonLabel}>Por qué encaja</Text>
                      <Text style={styles.reasonText}>
                        {getStopReason(act, tour)}
                      </Text>
                    </View>

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

                    <View style={styles.practicalGrid}>
                      {practicalRows.map((row) => (
                        <View key={row.label} style={styles.practicalItem}>
                          <Text style={styles.practicalLabel}>{row.label}</Text>
                          <Text style={styles.practicalValue}>{row.value}</Text>
                          <Text style={styles.practicalStatus}>
                            {row.status}
                          </Text>
                        </View>
                      ))}
                    </View>

                    {/* Transport to next */}
                    {!isLast && act.travelTimeToNext && (
                      <View style={styles.transportBadge}>
                        <Text style={styles.transportIcon}>
                          {TRANSPORT_ICONS[transport] || '🚶'}
                        </Text>
                        <Text style={styles.transportText}>
                          {formatTransport(transport)} · aprox{' '}
                          {act.travelTimeToNext} min
                          {distanceToNext ? ` · ${distanceToNext}` : ''}
                        </Text>
                      </View>
                    )}

                    <View style={styles.stopActions}>
                      <TouchableOpacity
                        style={styles.stopActionButton}
                        onPress={() => removeStop(stopKey, actName)}
                        activeOpacity={0.75}
                      >
                        <Text style={styles.stopActionText}>Quitar</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.stopActionButton}
                        onPress={() => {
                          setAdjustmentPreview({
                            id: 'replace_stop',
                            title: `Alternativas para ${actName}`,
                            status: 'alternative',
                            body:
                              'La sustitución necesita alternativas reales de la zona. Por ahora queda como intención visible y serializada.',
                            changes: [
                              'Buscar una parada cercana con rol similar.',
                              'Mantener tiempo y esfuerzo dentro del brief.',
                              'Usar este reemplazo como señal de regeneración futura.',
                            ],
                            stopKey,
                          });
                          trackCityDayAdjusted(tour.id, 'replace_stop', {
                            source: 'tour_detail_stop',
                            stop_name: actName,
                            adjustment_status: 'alternative',
                          });
                          void persistTourAdjustment({
                            type: 'replace_stop_preview',
                            stopKey,
                            stopName: actName,
                            source: 'tour_detail_stop',
                          });
                        }}
                        activeOpacity={0.75}
                      >
                        <Text style={styles.stopActionText}>Reemplazar</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>
            );
            })
          )}
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
  estimateBanner: {
    backgroundColor: colors.warningSoft,
    borderWidth: 1,
    borderColor: colors.warning,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: 4,
    marginTop: spacing.sm,
  },
  estimateTitle: {
    ...typography.label,
    color: colors.warning,
  },
  estimateText: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  decisionPanel: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  decisionEyebrow: {
    ...typography.label,
    color: colors.primary,
    letterSpacing: 0,
  },
  decisionTitle: {
    ...typography.headline,
    fontSize: 20,
  },
  decisionText: {
    ...typography.body,
    fontSize: 14,
    lineHeight: 20,
  },
  decisionMetaRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  decisionMetaItem: {
    flex: 1,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.sm,
    gap: 3,
  },
  decisionMetaLabel: {
    ...typography.label,
    letterSpacing: 0,
  },
  decisionMetaValue: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '700',
    lineHeight: 18,
  },
  decisionSectionLabel: {
    ...typography.label,
    color: colors.textSecondary,
    letterSpacing: 0,
    marginTop: spacing.xs,
  },
  decisionBulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  decisionBullet: {
    ...typography.body,
    color: colors.primary,
    lineHeight: 20,
  },
  decisionBulletText: {
    ...typography.caption,
    flex: 1,
    color: colors.textSecondary,
    lineHeight: 19,
  },
  tradeoffText: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 19,
  },
  uncertaintyBox: {
    backgroundColor: colors.warningSoft,
    borderWidth: 1,
    borderColor: colors.warning,
    borderRadius: radii.md,
    padding: spacing.sm,
    gap: 4,
  },
  uncertaintyTitle: {
    ...typography.label,
    color: colors.warning,
    letterSpacing: 0,
  },
  uncertaintyText: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  routeSummaryGrid: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  routeSummaryItem: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: 4,
  },
  routeSummaryLabel: {
    ...typography.label,
  },
  routeSummaryValue: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '700',
  },
  cockpitPanel: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  cockpitTitle: {
    ...typography.headline,
    fontSize: 16,
  },
  cockpitText: {
    ...typography.caption,
    lineHeight: 18,
  },
  cockpitActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  cockpitChip: {
    minHeight: 34,
    justifyContent: 'center',
    borderRadius: radii.full,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  cockpitChipText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '800',
  },
  previewPanel: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  previewTitle: {
    ...typography.headline,
    flex: 1,
    fontSize: 15,
  },
  previewStatus: {
    ...typography.caption,
    color: colors.primary,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  previewBody: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  previewChangeRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  previewChangeDot: {
    ...typography.caption,
    color: colors.primary,
    lineHeight: 18,
  },
  previewChangeText: {
    ...typography.caption,
    flex: 1,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  previewApplyButton: {
    minHeight: 38,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: radii.md,
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
  },
  previewApplyText: {
    ...typography.caption,
    color: colors.background,
    fontWeight: '800',
  },
  contextPanel: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  contextTitle: {
    ...typography.label,
    color: colors.textSecondary,
  },
  contextChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  contextChip: {
    borderRadius: radii.full,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.borderLight,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  contextChipText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '700',
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
  // Map
  mapSection: {
    paddingHorizontal: spacing.lg,
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
  routeMap: {
    height: 220,
    borderRadius: radii.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
  },
  mapStopList: {
    gap: spacing.xs,
  },
  mapStopPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  mapStopNumber: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.primarySoft,
    color: colors.primary,
    textAlign: 'center',
    lineHeight: 22,
    fontSize: 12,
    fontWeight: '900',
  },
  mapStopName: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
  },
  mapFallback: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  mapFallbackTitle: {
    ...typography.headline,
    fontSize: 16,
  },
  mapFallbackText: {
    ...typography.body,
    fontSize: 14,
    lineHeight: 20,
  },
  mapNotice: {
    ...typography.caption,
    lineHeight: 18,
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
  emptyItinerary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  emptyTitle: {
    ...typography.headline,
  },
  emptyText: {
    ...typography.body,
    fontSize: 14,
    lineHeight: 20,
  },
  generateLink: {
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: spacing.xs,
  },
  generateLinkText: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.background,
  },
  dayHeading: {
    ...typography.label,
    color: colors.primary,
    marginBottom: spacing.sm,
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
  reasonBox: {
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radii.md,
    padding: spacing.sm,
    gap: 3,
    marginTop: spacing.xs,
  },
  reasonLabel: {
    ...typography.label,
    color: colors.primary,
  },
  reasonText: {
    ...typography.caption,
    color: colors.text,
    lineHeight: 18,
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
  practicalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  practicalItem: {
    width: '47%',
    minHeight: 74,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.sm,
    gap: 2,
  },
  practicalLabel: {
    ...typography.label,
    fontSize: 10,
  },
  practicalValue: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '800',
  },
  practicalStatus: {
    ...typography.caption,
    fontSize: 10,
    color: colors.warning,
    textTransform: 'uppercase',
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
  stopActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  stopActionButton: {
    minHeight: 34,
    justifyContent: 'center',
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
  },
  stopActionText: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '800',
  },
});
