import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../auth/AuthContext';
import { useColors, useTheme } from '../theme/ThemeContext';

export function SettingsScreen() {
  const { user, logout } = useAuth();
  const { isDark, toggle } = useTheme();
  const c = useColors();

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.background }} contentContainerStyle={styles.content}>
      {/* Profile hero */}
      <View style={[styles.profileHero, { backgroundColor: c.surface }]}>
        <View style={[styles.avatar, { backgroundColor: c.primaryMuted }]}>
          <Text style={[styles.avatarText, { color: c.primary }]}>
            {user?.name?.charAt(0)?.toUpperCase() ?? '?'}
          </Text>
        </View>
        <Text style={[styles.profileName, { color: c.onSurface }]}>{user?.name ?? 'Usuario'}</Text>
        <Text style={[styles.profileEmail, { color: c.onSurfaceMuted }]}>{user?.email ?? ''}</Text>
      </View>

      {/* Appearance */}
      <Label text="Apariencia" c={c} />
      <View style={[styles.card, { backgroundColor: c.surface }]}>
        <SettingRow
          title="Modo oscuro"
          subtitle="Cambia el tema de la app"
          value={isDark}
          onChange={toggle}
          c={c}
        />
      </View>

      {/* Session */}
      <Label text="Sesión" c={c} />
      <TouchableOpacity style={[styles.logoutBtn, { borderColor: c.error + '55', backgroundColor: c.surface }]} onPress={logout}>
        <Text style={[styles.logoutText, { color: c.error }]}>Cerrar sesión</Text>
      </TouchableOpacity>

      <Text style={[styles.version, { color: c.onSurfaceMuted }]}>Delvo v1.0</Text>
    </ScrollView>
  );
}

function Label({ text, c }: { text: string; c: ReturnType<typeof useColors> }) {
  return <Text style={[styles.label, { color: c.onSurfaceMuted }]}>{text.toUpperCase()}</Text>;
}

function SettingRow({ title, subtitle, value, onChange, c }: {
  title: string; subtitle: string; value: boolean; onChange: (v: boolean) => void;
  c: ReturnType<typeof useColors>;
}) {
  return (
    <View style={styles.settingRow}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.settingTitle, { color: c.onSurface }]}>{title}</Text>
        <Text style={[styles.settingSub, { color: c.onSurfaceMuted }]}>{subtitle}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: c.outline, true: c.primary + '88' }}
        thumbColor={value ? c.primary : c.onSurfaceMuted}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 10, paddingBottom: 40 },
  profileHero: { borderRadius: 20, padding: 24, alignItems: 'center', gap: 8 },
  avatar: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  avatarText: { fontSize: 30, fontWeight: '800' },
  profileName: { fontSize: 20, fontWeight: '700' },
  profileEmail: { fontSize: 14 },
  label: { fontSize: 10, fontWeight: '700', letterSpacing: 1, marginTop: 6, marginLeft: 4 },
  card: { borderRadius: 16, overflow: 'hidden' },
  settingRow: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  settingTitle: { fontSize: 15, fontWeight: '600' },
  settingSub: { fontSize: 12, marginTop: 2 },
  logoutBtn: { borderRadius: 14, borderWidth: 1, paddingVertical: 16, alignItems: 'center' },
  logoutText: { fontSize: 15, fontWeight: '700' },
  version: { textAlign: 'center', fontSize: 12, marginTop: 8 },
});
