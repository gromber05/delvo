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
import { IconBrandGoogle, IconChevronRight, IconLogout } from '@tabler/icons-react-native';
import {
  MINUTES_OPTIONS,
  loadNotificationSettings,
  saveNotificationSettings,
} from '../notifications/NotificationSettings';

type ThemeMode = 'Light' | 'Dark' | 'System';

export function SettingsScreen() {
  const { user, logout } = useAuth();
  const { isDark, toggle } = useTheme();
  const c = useColors();

  const [googleEmail, setGoogleEmail] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [minutesBefore, setMinutesBefore] = useState(30);
  const [themeMode, setThemeMode] = useState<ThemeMode>(isDark ? 'Dark' : 'Light');

  // Notification toggles
  const [emailUpdates, setEmailUpdates] = useState(true);
  const [pushNotifs, setPushNotifs] = useState(true);
  const [taskReminders, setTaskReminders] = useState(false);
  const [stellaAlerts, setStellaAlerts] = useState(true);

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
      // silent
    }
  }, []);

  useEffect(() => { refreshGoogleEmail(); }, [refreshGoogleEmail]);
  useFocusEffect(useCallback(() => { refreshGoogleEmail(); }, [refreshGoogleEmail]));

  function handleThemeChange(mode: ThemeMode) {
    setThemeMode(mode);
    if (mode === 'Dark' && !isDark) toggle();
    if (mode === 'Light' && isDark) toggle();
  }

  async function connectGoogleCalendar() {
    setConnecting(true);
    try {
      const { url } = await api.googleCalendarConnectUrl();
      const result = await WebBrowser.openAuthSessionAsync(url, 'delvo://oauth-done');

      let statusOk = false;
      let emailFromUrl: string | null = null;
      if (result.type === 'success') {
        const query = result.url.split('?')[1] ?? '';
        const params: Record<string, string> = {};
        for (const part of query.split('&')) {
          const [k, ...rest] = part.split('=');
          if (k) params[k] = decodeURIComponent(rest.join('='));
        }
        statusOk = params.status === 'ok';
        emailFromUrl = params.email ?? null;
      }

      await refreshGoogleEmail();
      const linkedEmail = emailFromUrl ?? googleEmail;

      if (statusOk || linkedEmail) {
        try {
          const sync = await api.syncGoogleCalendar();
          Alert.alert(
            'Google Calendar',
            `${linkedEmail ? `Conectado como ${linkedEmail}\n` : ''}${sync.imported} eventos importados.`,
          );
        } catch {
          Alert.alert('Google Calendar', linkedEmail ? `Conectado como ${linkedEmail}` : 'Cuenta vinculada');
        }
      } else if (result.type !== 'cancel' && result.type !== 'dismiss') {
        Alert.alert('Error', 'No se pudo vincular Google Calendar');
      }
    } catch (e) {
      Alert.alert('Error', e instanceof Error ? e.message : 'Error desconocido');
    } finally {
      setConnecting(false);
    }
  }

  const initials = user?.name
    ? user.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()
    : '?';

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.background }}
      contentContainerStyle={[styles.content, { paddingTop: 56 }]}
    >
      <View style={[styles.profileHero, { backgroundColor: c.surface }]}>
        <View style={[styles.avatar, { backgroundColor: c.primaryMuted }]}>
          <Text style={[styles.avatarText, { color: c.primary }]}>{initials}</Text>
        </View>
        <Text style={[styles.profileName, { color: c.onSurface }]}>{user?.name ?? 'Usuario'}</Text>
        <View style={[styles.planBadge, { backgroundColor: '#B45309' }]}>
          <Text style={styles.planBadgeText}>PLAN PRO</Text>
        </View>
      </View>

      <SectionLabel text="CUENTA" c={c} />
      <View style={[styles.card, { backgroundColor: c.surface }]}>
        <AccountRow label="Información personal" c={c} />
        <View style={[styles.divider, { backgroundColor: c.outline }]} />
        <AccountRow label="Seguridad y contraseña" c={c} />
        <View style={[styles.divider, { backgroundColor: c.outline }]} />
        <AccountRow label="Facturación" c={c} isLast />
      </View>

      <SectionLabel text="INTEGRACIONES" c={c} />
      <View style={[styles.card, { backgroundColor: c.surface }]}>
        <View style={styles.integrationHero}>
          <View style={styles.integrationHeaderRow}>
            <IconBrandGoogle size={20} color="#4285F4" />
            <Text style={[styles.integrationTitle, { color: c.onSurface }]}>Integraciones</Text>
          </View>
          <Text style={[styles.integrationSub, { color: c.onSurfaceMuted }]}>
            Conecta tus herramientas externas para un flujo de trabajo sin interrupciones.
          </Text>
        </View>
        <View style={[styles.divider, { backgroundColor: c.outline }]} />
        <View style={styles.integrationRow}>
          <IconBrandGoogle size={22} color="#4285F4" />
          <View style={{ flex: 1 }}>
            <Text style={[styles.integrationItemTitle, { color: c.onSurface }]}>Calendario de Google</Text>
            <Text style={[styles.integrationItemSub, { color: c.onSurfaceMuted }]}>
              Sincroniza tus tareas y reuniones automáticamente.
            </Text>
          </View>
          {connecting ? (
            <ActivityIndicator size="small" color="#4285F4" />
          ) : googleEmail ? (
            <TouchableOpacity
              style={[styles.syncedDot, { backgroundColor: '#4285F420' }]}
              onPress={connectGoogleCalendar}
            >
              <View style={[styles.syncedCheck, { backgroundColor: '#4285F4' }]}>
                <Text style={styles.syncedCheckText}>✓</Text>
              </View>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.connectBtn, { borderColor: '#4285F4' }]}
              onPress={connectGoogleCalendar}
            >
              <Text style={[styles.connectBtnText, { color: '#4285F4' }]}>Conectar</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <SectionLabel text="NOTIFICACIONES" c={c} />
      <View style={[styles.card, { backgroundColor: c.surface }]}>
        <NotifRow
          label="Actualizaciones por correo"
          value={emailUpdates}
          onChange={setEmailUpdates}
          c={c}
        />
        <View style={[styles.divider, { backgroundColor: c.outline }]} />
        <NotifRow
          label="Notificaciones push"
          value={pushNotifs}
          onChange={setPushNotifs}
          c={c}
        />
        <View style={[styles.divider, { backgroundColor: c.outline }]} />
        <NotifRow
          label="Recordatorios de tareas"
          value={taskReminders}
          onChange={setTaskReminders}
          c={c}
        />
        <View style={[styles.divider, { backgroundColor: c.outline }]} />
        <NotifRow
          label="Alertas de Stella IA"
          value={stellaAlerts}
          onChange={setStellaAlerts}
          c={c}
          isLast
        />
      </View>

      <SectionLabel text="RECORDATORIOS" c={c} />
      <View style={[styles.card, { backgroundColor: c.surface }]}>
        <View style={styles.reminderRow}>
          <Text style={[styles.reminderLabel, { color: c.onSurface }]}>Avisar antes de</Text>
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
                  <Text style={[styles.minuteChipText, { color: selected ? '#fff' : c.onSurfaceMuted }]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>

      <SectionLabel text="PREFERENCIAS" c={c} />
      <View style={[styles.card, { backgroundColor: c.surface }]}>
        <View style={styles.prefRow}>
          <Text style={[styles.prefLabel, { color: c.onSurface }]}>Tema</Text>
          <View style={[styles.themeSelector, { backgroundColor: c.surfaceVariant }]}>
            {(['Light', 'Dark', 'System'] as ThemeMode[]).map(mode => (
              <TouchableOpacity
                key={mode}
                onPress={() => handleThemeChange(mode)}
                style={[
                  styles.themeOption,
                  themeMode === mode && { backgroundColor: c.surface },
                ]}
              >
                <Text style={[
                  styles.themeOptionText,
                  { color: themeMode === mode ? c.onSurface : c.onSurfaceMuted },
                  themeMode === mode && { fontWeight: '700' },
                ]}>
                  {mode === 'Light' ? 'Claro' : mode === 'Dark' ? 'Oscuro' : 'Sistema'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <View style={[styles.divider, { backgroundColor: c.outline }]} />
        <View style={styles.prefRow}>
          <Text style={[styles.prefLabel, { color: c.onSurface }]}>Zona horaria</Text>
          <View style={[styles.timezoneSelector, { backgroundColor: c.surfaceVariant, borderColor: c.outline }]}>
            <Text style={[styles.timezoneText, { color: c.onSurface }]}>
              {Intl.DateTimeFormat().resolvedOptions().timeZone}
            </Text>
            <IconChevronRight size={14} color={c.onSurfaceMuted} />
          </View>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.logoutBtn, { backgroundColor: c.surface }]}
        onPress={logout}
      >
        <IconLogout size={18} color={c.error} />
        <Text style={[styles.logoutText, { color: c.error }]}>Cerrar sesión</Text>
      </TouchableOpacity>

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

function SectionLabel({ text, c }: { text: string; c: ReturnType<typeof useColors> }) {
  return <Text style={[styles.sectionLabel, { color: c.onSurfaceMuted }]}>{text}</Text>;
}

function AccountRow({
  label,
  c,
  isLast = false,
}: {
  label: string;
  c: ReturnType<typeof useColors>;
  isLast?: boolean;
}) {
  return (
    <TouchableOpacity style={[styles.accountRow, isLast && { borderBottomWidth: 0 }]}>
      <Text style={[styles.accountRowLabel, { color: c.onSurface }]}>{label}</Text>
      <IconChevronRight size={18} color={c.onSurfaceMuted} />
    </TouchableOpacity>
  );
}

function NotifRow({
  label,
  value,
  onChange,
  c,
  isLast = false,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  c: ReturnType<typeof useColors>;
  isLast?: boolean;
}) {
  return (
    <View style={[styles.notifRow, isLast && { borderBottomWidth: 0 }]}>
      <Text style={[styles.notifLabel, { color: c.onSurface }]}>{label}</Text>
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
  content: { padding: 16, gap: 10, paddingBottom: 24 },

  profileHero: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  avatarText: { fontSize: 28, fontWeight: '800' },
  profileName: { fontSize: 22, fontWeight: '700' },
  planBadge: {
    paddingHorizontal: 16,
    paddingVertical: 5,
    borderRadius: 20,
    marginTop: 2,
  },
  planBadgeText: { fontSize: 12, fontWeight: '800', color: '#FEF3C7', letterSpacing: 0.5 },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
    marginTop: 8,
    marginLeft: 4,
    marginBottom: -2,
  },
  card: { borderRadius: 18, overflow: 'hidden' },
  divider: { height: 1, marginHorizontal: 16 },

  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 15,
  },
  accountRowLabel: { fontSize: 15, fontWeight: '500' },

  integrationHero: { padding: 16, paddingBottom: 12 },
  integrationHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  integrationTitle: { fontSize: 16, fontWeight: '700' },
  integrationSub: { fontSize: 13 },
  integrationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  integrationItemTitle: { fontSize: 14, fontWeight: '600' },
  integrationItemSub: { fontSize: 12, marginTop: 2 },
  syncedDot: { padding: 2, borderRadius: 20 },
  syncedCheck: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncedCheckText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  connectBtn: { borderRadius: 10, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 7 },
  connectBtnText: { fontSize: 13, fontWeight: '700' },

  notifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  notifLabel: { fontSize: 15, fontWeight: '500' },

  reminderRow: { padding: 16, gap: 10 },
  reminderLabel: { fontSize: 15, fontWeight: '600' },
  minutesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  minuteChip: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 6 },
  minuteChipText: { fontSize: 13, fontWeight: '600' },

  prefRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  prefLabel: { fontSize: 15, fontWeight: '500', flex: 1 },
  themeSelector: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 3,
    gap: 2,
  },
  themeOption: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 9 },
  themeOptionText: { fontSize: 13 },
  timezoneSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    maxWidth: 200,
  },
  timezoneText: { fontSize: 13, flex: 1 },

  logoutBtn: {
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 8,
  },
  logoutText: { fontSize: 15, fontWeight: '700' },
});
