import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
  type ReactNode,
} from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { colors, radii, spacing, typography } from '../constants/theme';

export type ZigzagRegion = {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
};

export type ZigzagCoordinate = {
  latitude: number;
  longitude: number;
};

export type ZigzagMapHandle = {
  animateToRegion: (region: ZigzagRegion, duration?: number) => void;
  fitToCoordinates: (
    coordinates: ZigzagCoordinate[],
    options?: { edgePadding?: unknown; animated?: boolean },
  ) => void;
};

type ZigzagMapProps = {
  children?: ReactNode;
  initialRegion?: ZigzagRegion;
  style?: StyleProp<ViewStyle>;
  onRegionChangeComplete?: (region: ZigzagRegion) => void;
  showsUserLocation?: boolean;
  showsMyLocationButton?: boolean;
  userInterfaceStyle?: 'light' | 'dark';
  mapType?: string;
};

const DEFAULT_REGION: ZigzagRegion = {
  latitude: -34.6037,
  longitude: -58.3816,
  latitudeDelta: 0.02,
  longitudeDelta: 0.02,
};

function formatCoord(value: number) {
  return value.toFixed(4);
}

export const ZigzagMap = forwardRef<ZigzagMapHandle, ZigzagMapProps>(
  ({ initialRegion, style, onRegionChangeComplete }, ref) => {
    const [region, setRegion] = useState(initialRegion || DEFAULT_REGION);

    useEffect(() => {
      if (initialRegion) setRegion(initialRegion);
    }, [initialRegion]);

    const updateRegion = (nextRegion: ZigzagRegion) => {
      setRegion(nextRegion);
      onRegionChangeComplete?.(nextRegion);
    };

    useImperativeHandle(ref, () => ({
      animateToRegion: (nextRegion) => updateRegion(nextRegion),
      fitToCoordinates: (coordinates) => {
        const first = coordinates[0];
        if (!first) return;

        updateRegion({
          latitude: first.latitude,
          longitude: first.longitude,
          latitudeDelta: 0.015,
          longitudeDelta: 0.015,
        });
      },
    }));

    const nudge = (latDelta: number, lngDelta: number) => {
      updateRegion({
        ...region,
        latitude: region.latitude + latDelta,
        longitude: region.longitude + lngDelta,
      });
    };

    const step = Math.max(region.latitudeDelta, 0.005) / 2;
    const canMove = Boolean(onRegionChangeComplete);

    return (
      <View style={[styles.webMap, style]}>
        <View style={styles.panel}>
          <Text style={styles.eyebrow}>Web location fallback</Text>
          <Text style={styles.title}>Zona seleccionada</Text>
          <Text style={styles.coords}>
            {formatCoord(region.latitude)}, {formatCoord(region.longitude)}
          </Text>
          <Text style={styles.hint}>
            Usá tu ubicación del navegador o ajustá la zona manualmente.
          </Text>

          {canMove ? (
            <View style={styles.controls}>
              <TouchableOpacity
                style={styles.controlButton}
                onPress={() => nudge(step, 0)}
              >
                <Text style={styles.controlText}>N</Text>
              </TouchableOpacity>
              <View style={styles.middleRow}>
                <TouchableOpacity
                  style={styles.controlButton}
                  onPress={() => nudge(0, -step)}
                >
                  <Text style={styles.controlText}>W</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.controlButton}
                  onPress={() => nudge(0, step)}
                >
                  <Text style={styles.controlText}>E</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={styles.controlButton}
                onPress={() => nudge(-step, 0)}
              >
                <Text style={styles.controlText}>S</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>
      </View>
    );
  },
);

ZigzagMap.displayName = 'ZigzagMap';

export function ZigzagMarker(_props: Record<string, unknown>) {
  return null;
}

export function ZigzagCircle(_props: Record<string, unknown>) {
  return null;
}

const styles = StyleSheet.create({
  webMap: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#111827',
    overflow: 'hidden',
  },
  panel: {
    width: '84%',
    maxWidth: 420,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(15, 23, 42, 0.92)',
    padding: spacing.lg,
    gap: spacing.xs,
    alignItems: 'center',
  },
  eyebrow: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  title: {
    ...typography.headline,
    textAlign: 'center',
  },
  coords: {
    ...typography.body,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
  hint: {
    ...typography.caption,
    textAlign: 'center',
    lineHeight: 18,
  },
  controls: {
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.sm,
  },
  middleRow: {
    flexDirection: 'row',
    gap: spacing.lg,
  },
  controlButton: {
    width: 38,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  controlText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '900',
  },
});
