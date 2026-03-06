import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, typography, spacing } from '../../constants/theme';

export default function ExplorarScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Explorar</Text>
        <Text style={styles.subtitle}>
          Descubrí tours y actividades cerca tuyo
        </Text>
      </View>
      <View style={styles.placeholder}>
        <Text style={styles.placeholderIcon}>🗺️</Text>
        <Text style={styles.placeholderText}>
          Próximamente: Mapa interactivo
        </Text>
      </View>
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
    paddingBottom: spacing.lg,
  },
  title: {
    ...typography.largeTitle,
  },
  subtitle: {
    ...typography.body,
    marginTop: spacing.xs,
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.md,
  },
  placeholderIcon: {
    fontSize: 64,
  },
  placeholderText: {
    ...typography.caption,
  },
});
