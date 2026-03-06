import { useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../lib/supabase';
import { colors, typography, spacing, radii } from '../constants/theme';

export default function AuthScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleMagicLink = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Ingresá tu email');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
    });
    setLoading(false);

    if (error) {
      Alert.alert('Error', error.message);
      return;
    }

    setSent(true);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.logo}>⚡</Text>
            <Text style={styles.title}>ZigZag</Text>
            <Text style={styles.subtitle}>
              Intelligent location-aware workflows
            </Text>
          </View>

          {/* Form */}
          {sent ? (
            <View style={styles.successContainer}>
              <Text style={styles.successIcon}>✉️</Text>
              <Text style={styles.successTitle}>¡Revisá tu email!</Text>
              <Text style={styles.successText}>
                Te enviamos un enlace mágico a{'\n'}
                <Text style={styles.emailHighlight}>{email}</Text>
              </Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => setSent(false)}
              >
                <Text style={styles.retryText}>Usar otro email</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.formContainer}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                style={styles.input}
                placeholder='tu@email.com'
                placeholderTextColor={colors.textMuted}
                value={email}
                onChangeText={setEmail}
                autoCapitalize='none'
                autoCorrect={false}
                keyboardType='email-address'
                textContentType='emailAddress'
                editable={!loading}
              />
              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleMagicLink}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color={colors.background} />
                ) : (
                  <Text style={styles.buttonText}>Enviar Magic Link</Text>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  // Header
  header: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  logo: {
    fontSize: 56,
    marginBottom: spacing.sm,
  },
  title: {
    ...typography.largeTitle,
    fontSize: 42,
    letterSpacing: -1,
  },
  subtitle: {
    ...typography.body,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  // Form
  formContainer: {
    gap: spacing.md,
  },
  inputLabel: {
    ...typography.caption,
    marginBottom: -spacing.sm,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.text,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radii.md,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.background,
  },
  // Success
  successContainer: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  successIcon: {
    fontSize: 48,
    marginBottom: spacing.sm,
  },
  successTitle: {
    ...typography.title,
  },
  successText: {
    ...typography.body,
    textAlign: 'center',
    lineHeight: 24,
  },
  emailHighlight: {
    color: colors.primary,
    fontWeight: '600',
  },
  retryButton: {
    marginTop: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radii.full,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  retryText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
