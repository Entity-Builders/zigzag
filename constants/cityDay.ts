export const CITY_DAY_INTENTS = [
  {
    value: 'must_see',
    label: 'Imperdibles',
    hint: 'lo esencial primero',
    prompt:
      'Priorizar lugares imperdibles y ordenar el día para cubrir lo más representativo sin hacerlo imposible.',
    decision:
      'priorizar lo más representativo y dejar lo secundario como alternativa',
  },
  {
    value: 'walk_less',
    label: 'Caminar poco',
    hint: 'menos traslados',
    prompt:
      'Minimizar caminatas largas, reducir cambios de zona y favorecer transiciones simples.',
    decision:
      'reducir distancia y concentrar el recorrido en una zona manejable',
  },
  {
    value: 'avoid_obvious',
    label: 'Menos obvio',
    hint: 'evitar postal típica',
    prompt:
      'Evitar una ruta demasiado obvia o genérica; incluir lugares con carácter local cuando sea razonable.',
    decision:
      'equilibrar atractivo turístico con paradas menos obvias y más locales',
  },
  {
    value: 'eat_well',
    label: 'Comer bien',
    hint: 'comida como eje',
    prompt:
      'Usar comida, café o descanso como parte central del recorrido, no como agregado tardío.',
    decision:
      'organizar la ruta alrededor de una buena pausa de comida o café',
  },
  {
    value: 'relaxed_day',
    label: 'Día tranquilo',
    hint: 'sin correr',
    prompt:
      'Priorizar ritmo tranquilo, menos paradas y tiempo suficiente para disfrutar cada lugar.',
    decision:
      'aceptar menos paradas para que el día se sienta más disfrutable',
  },
  {
    value: 'limited_time',
    label: 'Pocas horas',
    hint: 'aprovechar tiempo',
    prompt:
      'Optimizar para pocas horas disponibles, con decisiones claras y bajo margen de pérdida de tiempo.',
    decision:
      'concentrar el plan en paradas de alto valor para el tiempo disponible',
  },
  {
    value: 'family_plan',
    label: 'Plan familiar',
    hint: 'apto para grupo',
    prompt:
      'Priorizar paradas aptas para familia o grupo, con transiciones simples y descansos razonables.',
    decision:
      'evitar un recorrido frágil para grupo y favorecer paradas más tolerantes',
  },
  {
    value: 'low_budget',
    label: 'Bajo presupuesto',
    hint: 'cuidar costos',
    prompt:
      'Priorizar actividades gratuitas o accesibles y marcar costos inciertos antes de depender de ellos.',
    decision:
      'cuidar costos y favorecer paradas gratuitas o de bajo compromiso',
  },
] as const;

export const DAY_LENGTH_OPTIONS = [
  {
    value: 'short',
    label: '3h',
    hint: 'pocas horas',
    minutes: 180,
    prompt: 'Tengo unas 3 horas disponibles.',
  },
  {
    value: 'half_day',
    label: '5h',
    hint: 'medio día',
    minutes: 300,
    prompt: 'Tengo unas 5 horas disponibles.',
  },
  {
    value: 'full_day',
    label: '8h',
    hint: 'día completo',
    minutes: 480,
    prompt: 'Tengo casi un día completo disponible.',
  },
] as const;

export const EFFORT_OPTIONS = [
  {
    value: 'light',
    label: 'Suave',
    hint: 'poco esfuerzo',
    prompt: 'Prefiero bajo esfuerzo físico y transiciones simples.',
  },
  {
    value: 'moderate',
    label: 'Normal',
    hint: 'balanceado',
    prompt: 'Puedo caminar y moverme a ritmo moderado.',
  },
  {
    value: 'high',
    label: 'Activo',
    hint: 'más intenso',
    prompt: 'Acepto un día activo si mejora el recorrido.',
  },
] as const;

export const AVOIDANCE_OPTIONS = [
  {
    value: 'long_walks',
    label: 'Caminatas largas',
    prompt: 'Evitar caminatas largas cuando haya alternativas razonables.',
  },
  {
    value: 'crowds',
    label: 'Multitudes',
    prompt: 'Evitar lugares muy congestionados si hay buenas alternativas.',
  },
  {
    value: 'expensive',
    label: 'Gastos altos',
    prompt: 'Evitar paradas costosas salvo que sean muy valiosas.',
  },
  {
    value: 'queues',
    label: 'Filas',
    prompt: 'Evitar paradas con alta probabilidad de filas o reserva incierta.',
  },
  {
    value: 'tourist_traps',
    label: 'Trampas turísticas',
    prompt: 'Evitar lugares que se sientan demasiado genéricos o poco auténticos.',
  },
] as const;

export type CityDayIntent = (typeof CITY_DAY_INTENTS)[number]['value'];
export type DayLength = (typeof DAY_LENGTH_OPTIONS)[number]['value'];
export type EffortLevel = (typeof EFFORT_OPTIONS)[number]['value'];
export type Avoidance = (typeof AVOIDANCE_OPTIONS)[number]['value'];

export function getCityDayIntent(value?: string | null) {
  return (
    CITY_DAY_INTENTS.find((option) => option.value === value) ||
    CITY_DAY_INTENTS[0]
  );
}

export function getDayLength(value?: string | null) {
  return (
    DAY_LENGTH_OPTIONS.find((option) => option.value === value) ||
    DAY_LENGTH_OPTIONS[1]
  );
}

export function getEffortLevel(value?: string | null) {
  return (
    EFFORT_OPTIONS.find((option) => option.value === value) ||
    EFFORT_OPTIONS[1]
  );
}

export function getAvoidanceLabel(value: string): string {
  return (
    AVOIDANCE_OPTIONS.find((option) => option.value === value)?.label || value
  );
}

