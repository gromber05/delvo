import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { IconMail, IconLock } from '@tabler/icons-react-native';
import { useAuth } from '../auth/AuthContext';
import { useColors } from '../theme/ThemeContext';
import { AnimatedScreen } from '../components/AnimatedScreen';

export function LoginScreen() {
  const { login, register } = useAuth();
  const c = useColors();

  const [registerMode, setRegisterMode] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function clearError() { setError(null); }

  async function submit() {
    clearError();
    if (!email.trim() || !password) { setError('Por favor, completa todos los campos requeridos.'); return; }
    if (registerMode && !name.trim()) { setError('El nombre es obligatorio.'); return; }
    setLoading(true);
    try {
      if (registerMode) await register(name.trim(), email.trim(), password);
      else await login(email.trim(), password);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error de autenticación.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AnimatedScreen>
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: '#0D1117' }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[StyleSheet.absoluteFill, styles.gridBg]} pointerEvents="none">
        {Array.from({ length: 20 }).map((_, i) => (
          <View key={`h${i}`} style={[styles.gridLine, styles.gridHLine, { top: i * 42 }]} />
        ))}
        {Array.from({ length: 10 }).map((_, i) => (
          <View key={`v${i}`} style={[styles.gridLine, styles.gridVLine, { left: i * 42 }]} />
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.logoArea}>
          <Image source={require('../../assets/icon.png')} style={styles.logoImage} resizeMode="contain" />
        </View>

        <Text style={styles.heroTitle}>
          {registerMode ? 'Crear cuenta' : 'Bienvenido de nuevo'}
        </Text>
        <Text style={styles.heroSub}>
          {registerMode
            ? 'Únete a tu espacio de trabajo en Delvo.'
            : 'Inicia sesión en tu espacio de trabajo en Delvo.'}
        </Text>

        <View style={[styles.card, { backgroundColor: c.surface }]}>
          {registerMode && (
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: c.onSurfaceMuted }]}>NOMBRE COMPLETO</Text>
              <View style={[styles.inputWrap, { backgroundColor: c.surfaceVariant, borderColor: c.outline }]}>
                <TextInput
                  style={[styles.input, { color: c.onSurface }]}
                  placeholder="Tu nombre"
                  placeholderTextColor={c.onSurfaceMuted}
                  value={name}
                  onChangeText={(v) => { setName(v); clearError(); }}
                  autoCapitalize="words"
                  editable={!loading}
                />
              </View>
            </View>
          )}

          <View style={styles.fieldGroup}>
            <Text style={[styles.fieldLabel, { color: c.onSurfaceMuted }]}>CORREO ELECTRÓNICO</Text>
            <View style={[styles.inputWrap, { backgroundColor: c.surfaceVariant, borderColor: c.outline }]}>
              <IconMail size={18} color={c.onSurfaceMuted} style={{ marginLeft: 14 }} />
              <TextInput
                style={[styles.input, { color: c.onSurface }]}
                placeholder="alex@example.com"
                placeholderTextColor={c.onSurfaceMuted}
                value={email}
                onChangeText={(v) => { setEmail(v); clearError(); }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                editable={!loading}
              />
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <View style={styles.passwordLabelRow}>
              <Text style={[styles.fieldLabel, { color: c.onSurfaceMuted }]}>CONTRASEÑA</Text>
              {!registerMode && (
                <TouchableOpacity>
                  <Text style={[styles.forgotText, { color: c.primary }]}>¿Olvidaste?</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={[styles.inputWrap, { backgroundColor: c.surfaceVariant, borderColor: c.outline }]}>
              <IconLock size={18} color={c.onSurfaceMuted} style={{ marginLeft: 14 }} />
              <TextInput
                style={[styles.input, { color: c.onSurface }]}
                placeholder="••••••••"
                placeholderTextColor={c.onSurfaceMuted}
                value={password}
                onChangeText={(v) => { setPassword(v); clearError(); }}
                secureTextEntry
                editable={!loading}
              />
            </View>
          </View>

          {error ? <Text style={[styles.error, { color: c.error }]}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: c.primary }, loading && styles.btnDisabled]}
            onPress={submit}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color="#fff" />
              : <Text style={styles.primaryBtnText}>
                  {registerMode ? 'CREAR CUENTA' : 'INICIAR SESIÓN'}
                </Text>
            }
          </TouchableOpacity>

        </View>

        <TouchableOpacity
          style={styles.switchRow}
          onPress={() => { setRegisterMode((m) => !m); clearError(); }}
          disabled={loading}
        >
          <Text style={[styles.switchText, { color: c.onSurfaceMuted }]}>
            {registerMode ? "¿Ya tienes cuenta? " : "¿No tienes cuenta? "}
            <Text style={[styles.switchLink, { color: c.primary }]}>
              {registerMode ? 'Iniciar sesión' : 'Registrarse'}
            </Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
    </AnimatedScreen>
  );
}

const styles = StyleSheet.create({
  gridBg: { opacity: 0.00 },
  gridLine: { position: 'absolute', backgroundColor: '#fff' },
  gridHLine: { left: 0, right: 0, height: 1 },
  gridVLine: { top: 0, bottom: 0, width: 1 },

  container: { flexGrow: 1, padding: 24, gap: 16, alignItems: 'center' },

  logoArea: { marginTop: 32, marginBottom: 8, alignItems: 'center' },
  logoImage: { width: 80, height: 80 },

  heroTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#F9FAFB',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  heroSub: {
    fontSize: 15,
    color: 'rgba(249,250,251,0.55)',
    textAlign: 'center',
    marginTop: -4,
  },

  card: {
    width: '100%',
    borderRadius: 20,
    padding: 20,
    gap: 16,
  },
  fieldGroup: { gap: 6 },
  fieldLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  passwordLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  forgotText: { fontSize: 13, fontWeight: '600' },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  input: {
    flex: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
  },
  error: { fontSize: 13, textAlign: 'center' },
  primaryBtn: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  btnDisabled: { opacity: 0.6 },
  primaryBtnText: {
    fontWeight: '800',
    fontSize: 15,
    color: '#fff',
    letterSpacing: 1,
  },
  switchRow: { marginTop: 4 },
  switchText: { fontSize: 14, textAlign: 'center' },
  switchLink: { fontWeight: '700' },
});
