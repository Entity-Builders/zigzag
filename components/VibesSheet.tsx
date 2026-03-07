import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Animated,
  Dimensions,
  Pressable,
} from 'react-native';
import { colors, typography, spacing, radii } from '../constants/theme';
import { VIBES, TRANSPORT_OPTIONS } from '../constants/vibes';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface VibesSheetProps {
  visible: boolean;
  activeVibes: string[];
  transportFilter: string | null;
  onVibesChange: (vibes: string[]) => void;
  onTransportChange: (transport: string | null) => void;
  onClose: () => void;
}

export default function VibesSheet({
  visible,
  activeVibes,
  transportFilter,
  onVibesChange,
  onTransportChange,
  onClose,
}: VibesSheetProps) {
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        damping: 25,
        stiffness: 200,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const toggleVibe = (key: string) => {
    if (activeVibes.includes(key)) {
      onVibesChange(activeVibes.filter((v) => v !== key));
    } else {
      onVibesChange([...activeVibes, key]);
    }
  };

  const toggleTransport = (key: string) => {
    onTransportChange(transportFilter === key ? null : key);
  };

  const activeCount = activeVibes.length + (transportFilter ? 1 : 0);

  const handleClearAll = () => {
    onVibesChange([]);
    onTransportChange(null);
  };

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType='none'
      onRequestClose={onClose}
    >
      {/* Backdrop */}
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View />
      </Pressable>

      {/* Sheet */}
      <Animated.View
        style={[styles.sheet, { transform: [{ translateY: slideAnim }] }]}
      >
        {/* Handle */}
        <View style={styles.handleRow}>
          <View style={styles.handle} />
        </View>

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>✨ Tu vibe</Text>
          {activeCount > 0 && (
            <TouchableOpacity onPress={handleClearAll} activeOpacity={0.7}>
              <Text style={styles.clearText}>Limpiar todo</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Vibes Grid */}
        <Text style={styles.sectionLabel}>EXPERIENCIA</Text>
        <View style={styles.vibesGrid}>
          {VIBES.map((vibe) => {
            const isActive = activeVibes.includes(vibe.key);
            return (
              <TouchableOpacity
                key={vibe.key}
                style={[styles.vibeChip, isActive && styles.vibeChipActive]}
                onPress={() => toggleVibe(vibe.key)}
                activeOpacity={0.7}
              >
                <Text style={styles.vibeEmoji}>{vibe.emoji}</Text>
                <Text
                  style={[styles.vibeLabel, isActive && styles.vibeLabelActive]}
                >
                  {vibe.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Transport */}
        <Text style={[styles.sectionLabel, { marginTop: spacing.lg }]}>
          TRANSPORTE
        </Text>
        <View style={styles.transportRow}>
          {TRANSPORT_OPTIONS.map((opt) => {
            const isActive = transportFilter === opt.key;
            return (
              <TouchableOpacity
                key={opt.key}
                style={[
                  styles.transportChip,
                  isActive && styles.transportChipActive,
                ]}
                onPress={() => toggleTransport(opt.key)}
                activeOpacity={0.7}
              >
                <Text style={styles.transportEmoji}>{opt.emoji}</Text>
                <Text
                  style={[
                    styles.transportLabel,
                    isActive && styles.transportLabelActive,
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Done button */}
        <TouchableOpacity
          style={styles.doneButton}
          onPress={onClose}
          activeOpacity={0.8}
        >
          <Text style={styles.doneButtonText}>
            {activeCount > 0
              ? `Listo · ${activeCount} filtro${activeCount > 1 ? 's' : ''}`
              : 'Sin filtros — mostrar todo'}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingBottom: 40,
    maxHeight: SCREEN_HEIGHT * 0.7,
  },
  handleRow: {
    alignItems: 'center',
    paddingTop: spacing.sm,
    paddingBottom: spacing.xs,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.borderLight,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  headerTitle: {
    ...typography.title,
    fontSize: 20,
  },
  clearText: {
    ...typography.caption,
    color: colors.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  sectionLabel: {
    ...typography.label,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  // ── Vibes Grid ──
  vibesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg - 4,
    gap: 8,
  },
  vibeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  vibeChipActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  vibeEmoji: {
    fontSize: 16,
  },
  vibeLabel: {
    ...typography.caption,
    fontSize: 14,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  vibeLabelActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  // ── Transport ──
  transportRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    gap: 10,
  },
  transportChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: radii.lg,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  transportChipActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  transportEmoji: {
    fontSize: 16,
  },
  transportLabel: {
    ...typography.caption,
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  transportLabelActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  // ── Done ──
  doneButton: {
    marginTop: spacing.lg,
    marginHorizontal: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: radii.lg,
    paddingVertical: 16,
    alignItems: 'center',
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#000',
  },
});
