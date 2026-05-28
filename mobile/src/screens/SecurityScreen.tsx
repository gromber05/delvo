import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '../theme/ThemeContext';
import { api } from '../api/client';
import { IconArrowLeft, IconCheck, IconEye, IconEyeOff, IconLock } from '@tabler/icons-react-native';

export function SecurityScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!currentPassword) {
      Alert.alert('Error', 'Introduce tu contraseña actual');
      return;
    }
    if (newPassword.length < 8) {
      Alert.alert('Error', 'La nueva contraseña debe tener al menos 8 caracteres');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'Las contraseñas no coinciden');
      return;
    }
    setSaving(true);
    try {
      await api.changePassword({ current_password: currentPassword, new_password: newPassword });
      Alert.alert('Listo', 'Contraseña actualizada correctamente', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo cambiar la contraseña');
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: c.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <IconArrowLeft size={22} color={c.onSurface} />
        </TouchableOpacity>

        <View style={[styles.iconBox, { backgroundColor: c.surface }]}>
          <View style={[styles.iconCircle, { backgroundColor: c.primaryMuted }]}>
            <IconLock size={32} color={c.primary} />
          </View>
          <Text style={[styles.iconBoxTitle, { color: c.onSurface }]}>Cambiar contraseña</Text>
          <Text style={[styles.iconBoxSub, { color: c.onSurfaceMuted }]}>
            Tu contraseña debe tener al menos 8 caracteres.
          </Text>
        </View>

        <View style={styles.fields}>
          <PasswordField
            label="Contraseña actual"
            value={currentPassword}
            onChange={setCurrentPassword}
            show={showCurrent}
            onToggleShow={() => setShowCurrent(v => !v)}
            c={c}
          />
          <PasswordField
            label="Nueva contraseña"
            value={newPassword}
            onChange={setNewPassword}
            show={showNew}
            onToggleShow={() => setShowNew(v => !v)}
            c={c}
            hint={newPassword.length > 0 && newPassword.length < 8 ? 'Mínimo 8 caracteres' : undefined}
            hintError
          />
          <PasswordField
            label="Confirmar nueva contraseña"
            value={confirmPassword}
            onChange={setConfirmPassword}
            show={showConfirm}
            onToggleShow={() => setShowConfirm(v => !v)}
            c={c}
            hint={
              confirmPassword.length > 0 && confirmPassword !== newPassword
                ? 'Las contraseñas no coinciden'
                : confirmPassword.length > 0 && confirmPassword === newPassword
                ? '✓ Las contraseñas coinciden'
                : undefined
            }
            hintError={confirmPassword.length > 0 && confirmPassword !== newPassword}
          />
        </View>

        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: c.primary }, saving && { opacity: 0.7 }]}
          onPress={handleSave}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <IconCheck size={18} color="#fff" />
              <Text style={styles.saveBtnText}>Actualizar contraseña</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  show,
  onToggleShow,
  c,
  hint,
  hintError = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  show: boolean;
  onToggleShow: () => void;
  c: ReturnType<typeof useColors>;
  hint?: string;
  hintError?: boolean;
}) {
  return (
    <View style={[styles.fieldCard, { backgroundColor: c.surface }]}>
      <Text style={[styles.fieldLabel, { color: c.onSurfaceMuted }]}>{label}</Text>
      <View style={styles.inputRow}>
        <TextInput
          style={[styles.fieldInput, { color: c.onSurface, flex: 1 }]}
          value={value}
          onChangeText={onChange}
          secureTextEntry={!show}
          placeholder="••••••••"
          placeholderTextColor={c.onSurfaceMuted}
          autoCapitalize="none"
          autoCorrect={false}
        />
        <TouchableOpacity onPress={onToggleShow} style={styles.eyeBtn}>
          {show
            ? <IconEyeOff size={18} color={c.onSurfaceMuted} />
            : <IconEye size={18} color={c.onSurfaceMuted} />
          }
        </TouchableOpacity>
      </View>
      {hint && (
        <Text style={[styles.hint, { color: hintError ? c.error : '#22c55e' }]}>{hint}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16, paddingBottom: 40 },

  backBtn: { padding: 6, alignSelf: 'flex-start' },

  iconBox: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  iconBoxTitle: { fontSize: 18, fontWeight: '700' },
  iconBoxSub: { fontSize: 13, textAlign: 'center' },

  fields: { gap: 12 },

  fieldCard: {
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    gap: 4,
  },
  fieldLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  inputRow: { flexDirection: 'row', alignItems: 'center' },
  fieldInput: { fontSize: 16, fontWeight: '500', paddingVertical: 4 },
  eyeBtn: { padding: 6 },
  hint: { fontSize: 12, marginTop: 2 },

  saveBtn: {
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
