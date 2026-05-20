import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { useColors } from '../theme/ThemeContext';

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
    if (!email.trim() || !password) { setError('Completa los campos requeridos.'); return; }
    if (registerMode && !name.trim()) { setError('El nombre es obligatorio.'); return; }
    setLoading(true);
    try {
      if (registerMode) await register(name.trim(), email.trim(), password);
      else await login(email.trim(), password);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'No se pudo autenticar.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        {}
        <View style={styles.logoArea}>
          <View style={[styles.logoCircle, { backgroundColor: c.primaryMuted }]}>
            <Text style={[styles.logoLetter, { color: c.primary }]}>D</Text>
          </View>
          <Text style={[styles.logoName, { color: c.onSurface }]}>Delvo</Text>
          <Text style={[styles.logoSub, { color: c.onSurfaceMuted }]}>Tu asistente inteligente</Text>
        </View>

        {}
        <View style={[styles.card, { backgroundColor: c.surface }]}>
          <Text style={[styles.cardTitle, { color: c.onSurface }]}>
            {registerMode ? 'Crear cuenta' : 'Iniciar sesión'}
          </Text>

          {registerMode && (
            <Field label="Nombre" c={c}>
              <TextInput
                style={[styles.input, { backgroundColor: c.surfaceVariant, color: c.onSurface, borderColor: c.outline }]}
                placeholder="Tu nombre"
                placeholderTextColor={c.onSurfaceMuted}
                value={name}
                onChangeText={(v) => { setName(v); clearError(); }}
                autoCapitalize="words"
                editable={!loading}
              />
            </Field>
          )}

          <Field label="Email" c={c}>
            <TextInput
              style={[styles.input, { backgroundColor: c.surfaceVariant, color: c.onSurface, borderColor: c.outline }]}
              placeholder="correo@ejemplo.com"
              placeholderTextColor={c.onSurfaceMuted}
              value={email}
              onChangeText={(v) => { setEmail(v); clearError(); }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
            />
          </Field>

          <Field label="Contraseña" c={c}>
            <TextInput
              style={[styles.input, { backgroundColor: c.surfaceVariant, color: c.onSurface, borderColor: c.outline }]}
              placeholder="••••••••"
              placeholderTextColor={c.onSurfaceMuted}
              value={password}
              onChangeText={(v) => { setPassword(v); clearError(); }}
              secureTextEntry
              editable={!loading}
            />
          </Field>

          {error ? <Text style={[styles.error, { color: c.error }]}>{error}</Text> : null}

          <TouchableOpacity
            style={[styles.btn, { backgroundColor: c.primary }, loading && styles.btnDisabled]}
            onPress={submit}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color={c.onPrimary} />
              : <Text style={[styles.btnText, { color: c.onPrimary }]}>{registerMode ? 'Crear cuenta' : 'Entrar'}</Text>}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.switchBtn, { borderColor: c.outline }]}
            onPress={() => { setRegisterMode((m) => !m); clearError(); }}
            disabled={loading}
          >
            <Text style={[styles.switchText, { color: c.onSurfaceMuted }]}>
              {registerMode ? '¿Ya tienes cuenta? ' : '¿Sin cuenta? '}
              <Text style={{ color: c.primary, fontWeight: '700' }}>
                {registerMode ? 'Inicia sesión' : 'Regístrate'}
              </Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, children, c }: { label: string; children: React.ReactNode; c: ReturnType<typeof useColors> }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={[styles.fieldLabel, { color: c.onSurfaceMuted }]}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', padding: 24, gap: 24 },
  logoArea: { alignItems: 'center', gap: 8 },
  logoCircle: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  logoLetter: { fontSize: 36, fontWeight: '800' },
  logoName: { fontSize: 32, fontWeight: '800', letterSpacing: 0.5 },
  logoSub: { fontSize: 14 },
  card: { borderRadius: 20, padding: 24, gap: 14 },
  cardTitle: { fontSize: 20, fontWeight: '700', marginBottom: 2 },
  fieldLabel: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    borderWidth: 1,
  },
  error: { fontSize: 13 },
  btn: { borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 2 },
  btnDisabled: { opacity: 0.6 },
  btnText: { fontWeight: '700', fontSize: 15 },
  switchBtn: { alignItems: 'center', paddingVertical: 4 },
  switchText: { fontSize: 14 },
});
