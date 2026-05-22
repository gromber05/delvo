import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as WebBrowser from 'expo-web-browser';
import { useAuth } from '../auth/AuthContext';
import { useColors, useTheme } from '../theme/ThemeContext';
import { api } from '../api/client';
import { IconBrandGoogle } from '@tabler/icons-react-native';
import {
  MINUTES_OPTIONS,
  loadNotificationSettings,
  saveNotificationSettings,
} from '../notifications/NotificationSettings';

export function SettingsScreen() {
  const { user, logout } = useAuth();
  const { isDark, toggle } = useTheme();
  const c = useColors();

  const [googleEmail, setGoogleEmail] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [minutesBefore, setMinutesBefore] = useState(30);

  useEffect(() => {
    loadNotificationSettings().then(s => setMinutesBefore(s.minutesBefore));
  }, []);

  async function handleMinutesChange(m: number) {
    setMinutesBefore(m);
    await saveNotificationSettings({ minutesBefore: m });
  }

  const refreshGoogleEmail = useCallback(async () => {
    try {
      const data = await api.me();
      setGoogleEmail(data.user.google_email ?? null);
    } catch {
      
    }
  }, []);

  useEffect(() => { refreshGoogleEmail(); }, [refreshGoogleEmail]);

  useFocusEffect(useCallback(() => { refreshGoogleEmail(); }, [refreshGoogleEmail]));

  async function connectGoogleCalendar() {
    setConnecting(true);
    try {
      const { url } = await api.googleCalendarConnectUrl();
      const result = await WebBrowser.openAuthSessionAsync(url, 'https://delvo.gromber05.dev/oauth-done');

      if (result.type === 'success') {
        const query = result.url.split('?')[1] ?? '';
        const params: Record<string, string> = {};
        for (const part of query.split('&')) {
          const [k, ...rest] = part.split('=');
          if (k) params[k] = decodeURIComponent(rest.join('='));
        }
        if (params.status === 'ok') {
          await refreshGoogleEmail();
          const email = params.email ?? null;
          try {
            const sync = await api.syncGoogleCalendar();
            Alert.alert(
              'Google Calendar',
              `${email ? `Conectado como ${email}\n` : ''}${sync.imported} eventos importados.`,
            );
          } catch {
            Alert.alert('Google Calendar', email ? `Conectado como ${email}` : 'Cuenta vinculada');
          }
        } else {
          Alert.alert('Error', 'No se pudo vincular Google Calendar');
        }
      } else {
        
        await refreshGoogleEmail();
      }
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Error desconocido');
    } finally {
      setConnecting(false);
    }
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: c.background }} contentContainerStyle={styles.content}>
      {}
      <View style={[styles.profileHero, { backgroundColor: c.surface }]}>
        <View style={[styles.avatar, { backgroundColor: c.primaryMuted }]}>
          <Text style={[styles.avatarText, { color: c.primary }]}>
            {user?.name?.charAt(0)?.toUpperCase() ?? '?'}
          </Text>
        </View>
        <Text style={[styles.profileName, { color: c.onSurface }]}>{user?.name ?? 'Usuario'}</Text>
        <Text style={[styles.profileEmail, { color: c.onSurfaceMuted }]}>{user?.email ?? ''}</Text>
      </View>

      {}
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

      {}
      <Label text="Notificaciones" c={c} />
      <View style={[styles.card, { backgroundColor: c.surface }]}>
        <View style={styles.settingRow}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.settingTitle, { color: c.onSurface }]}>Aviso previo</Text>
            <Text style={[styles.settingSub, { color: c.onSurfaceMuted }]}>Tiempo antes de recibir la notificación</Text>
          </View>
        </View>
        <View style={styles.minutesRow}>
          {MINUTES_OPTIONS.map(m => {
            const selected = m === minutesBefore;
            const label = m >= 60 ? `${m / 60}h` : `${m}m`;
            return (
              <TouchableOpacity
                key={m}
                onPress={() => handleMinutesChange(m)}
                style={[
                  styles.minuteChip,
                  {
                    backgroundColor: selected ? c.primary : c.surfaceVariant,
                    borderColor: selected ? c.primary : c.outline,
                  },
                ]}
              >
                <Text style={[styles.minuteChipText, { color: selected ? c.onPrimary : c.onSurfaceMuted }]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {}
      <Label text="Integraciones" c={c} />
      <View style={[styles.card, { backgroundColor: c.surface }]}>
        <View style={styles.integrationRow}>
          <IconBrandGoogle size={22} color="#4285F4" />
          <View style={{ flex: 1 }}>
            <Text style={[styles.settingTitle, { color: c.onSurface }]}>Google Calendar</Text>
            <Text style={[styles.settingSub, { color: googleEmail ? '#4285F4' : c.onSurfaceMuted }]}>
              {googleEmail ? `● ${googleEmail}` : 'Sin vincular'}
            </Text>
          </View>
          {connecting ? (
            <ActivityIndicator size="small" color="#4285F4" />
          ) : (
            <TouchableOpacity
              style={[styles.connectBtn, { borderColor: googleEmail ? c.outline : '#4285F4' }]}
              onPress={connectGoogleCalendar}
            >
              <Text style={[styles.connectBtnText, { color: googleEmail ? c.onSurfaceMuted : '#4285F4' }]}>
                {googleEmail ? 'Reconectar' : 'Conectar'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {}
      <Label text="Sesión" c={c} />
      <TouchableOpacity
        style={[styles.logoutBtn, { borderColor: c.error + '55', backgroundColor: c.surface }]}
        onPress={logout}
      >
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
  integrationRow: { flexDirection: 'row', alignItems: 'center', padding: 16, gap: 12 },
  settingTitle: { fontSize: 15, fontWeight: '600' },
  settingSub: { fontSize: 12, marginTop: 2 },
  connectBtn: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 7 },
  connectBtnText: { fontSize: 13, fontWeight: '700' },
  minutesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16, paddingBottom: 14 },
  minuteChip: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 6 },
  minuteChipText: { fontSize: 13, fontWeight: '600' },
  logoutBtn: { borderRadius: 14, borderWidth: 1, paddingVertical: 16, alignItems: 'center' },
  logoutText: { fontSize: 15, fontWeight: '700' },
  version: { textAlign: 'center', fontSize: 12, marginTop: 8 },
});
