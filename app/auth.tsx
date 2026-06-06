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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@eb-packages/logic';
import { colors, typography, spacing, radii } from '../constants/theme';
import { showAlert } from '../utils/alerts';

export default function AuthScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);

  const handleAuth = async () => {
    if (!email.trim()) {
      showAlert('Error', 'Ingresá tu email');
      return;
    }
    if (!password.trim() || password.length < 6) {
      showAlert('Error', 'La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setLoading(true);

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password.trim(),
      });
      setLoading(false);
      if (error) {
        showAlert('Error', error.message);
        return;
      }
      showAlert('¡Listo!', 'Cuenta creada. Ya estás logueado.');
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password.trim(),
      });
      setLoading(false);
      if (error) {
        showAlert('Error', error.message);
        return;
      }
    }
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
              Planificá tu día en la ciudad y guardá tus itinerarios
            </Text>
          </View>

          {/* Form */}
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
            <Text style={styles.inputLabel}>Contraseña</Text>
            <TextInput
              style={styles.input}
              placeholder='••••••••'
              placeholderTextColor={colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize='none'
              autoCorrect={false}
              textContentType={isSignUp ? 'newPassword' : 'password'}
              editable={!loading}
            />
            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleAuth}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color={colors.background} />
              ) : (
                <Text style={styles.buttonText}>
                  {isSignUp ? 'Crear cuenta' : 'Iniciar sesión'}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.toggleButton}
              onPress={() => setIsSignUp(!isSignUp)}
              disabled={loading}
            >
              <Text style={styles.toggleText}>
                {isSignUp
                  ? '¿Ya tenés cuenta? Iniciá sesión'
                  : '¿No tenés cuenta? Crear una'}
              </Text>
            </TouchableOpacity>
          </View>
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
  toggleButton: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  toggleText: {
    ...typography.caption,
    color: colors.primary,
  },
});
