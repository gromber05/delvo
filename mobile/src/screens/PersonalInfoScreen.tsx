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
import { useAuth } from '../auth/AuthContext';
import { useColors } from '../theme/ThemeContext';
import { api } from '../api/client';
import { IconArrowLeft, IconCheck } from '@tabler/icons-react-native';

export function PersonalInfoScreen() {
  const { user, updateUser } = useAuth();
  const c = useColors();
  const navigation = useNavigation();

  const [name, setName] = useState(user?.name ?? '');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) {
      Alert.alert('Error', 'El nombre no puede estar vacío');
      return;
    }
    setSaving(true);
    try {
      const { user: updated } = await api.updateProfile({ name: trimmed });
      await updateUser(updated);
      Alert.alert('Listo', 'Información actualizada correctamente', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo actualizar');
    } finally {
      setSaving(false);
    }
  }

  const initials = name
    ? name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
    : '?';

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: c.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: 56 }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <IconArrowLeft size={22} color={c.onSurface} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: c.onSurface }]}>Información personal</Text>
          <View style={{ width: 36 }} />
        </View>

        <View style={[styles.avatarContainer, { backgroundColor: c.surface }]}>
          <View style={[styles.avatar, { backgroundColor: c.primaryMuted }]}>
            <Text style={[styles.avatarText, { color: c.primary }]}>{initials}</Text>
          </View>
        </View>

        <View style={styles.fields}>
          <View style={[styles.fieldCard, { backgroundColor: c.surface }]}>
            <Text style={[styles.fieldLabel, { color: c.onSurfaceMuted }]}>Nombre completo</Text>
            <TextInput
              style={[styles.fieldInput, { color: c.onSurface }]}
              value={name}
              onChangeText={setName}
              placeholder="Tu nombre"
              placeholderTextColor={c.onSurfaceMuted}
              autoCapitalize="words"
              returnKeyType="done"
              onSubmitEditing={handleSave}
            />
          </View>

          <View style={[styles.fieldCard, { backgroundColor: c.surface }]}>
            <Text style={[styles.fieldLabel, { color: c.onSurfaceMuted }]}>Correo electrónico</Text>
            <Text style={[styles.fieldValue, { color: c.onSurface }]}>{user?.email ?? ''}</Text>
            <Text style={[styles.fieldHint, { color: c.onSurfaceMuted }]}>
              El correo no se puede modificar
            </Text>
          </View>
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
              <Text style={styles.saveBtnText}>Guardar cambios</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16, paddingBottom: 40 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  backBtn: { padding: 6 },
  title: { fontSize: 18, fontWeight: '700' },

  avatarContainer: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 28, fontWeight: '800' },

  fields: { gap: 12 },

  fieldCard: {
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 4,
  },
  fieldLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  fieldInput: { fontSize: 16, fontWeight: '500', paddingVertical: 4 },
  fieldValue: { fontSize: 16, fontWeight: '500', paddingVertical: 4 },
  fieldHint: { fontSize: 12, marginTop: 2 },

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
