import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Share,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as WebBrowser from 'expo-web-browser';
import { useAuth } from '../auth/AuthContext';
import { useColors, useTheme, ThemeMode } from '../theme/ThemeContext';
import { api } from '../api/client';
import { IconBrandGoogle, IconChevronRight, IconLogout } from '@tabler/icons-react-native';
import {
  MINUTES_OPTIONS,
  loadNotificationSettings,
  saveNotificationSettings,
} from '../notifications/NotificationSettings';
import { SettingsStackParamList } from '../navigation/SettingsNavigator';

export function SettingsScreen() {
  const { user, logout } = useAuth();
  const { isDark, mode, setMode } = useTheme();
  const c = useColors();
  const navigation = useNavigation<NativeStackNavigationProp<SettingsStackParamList>>();

  const [googleEmail, setGoogleEmail] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [minutesBefore, setMinutesBefore] = useState(30);

  const [pushNotifs, setPushNotifs] = useState(true);
  const [taskReminders, setTaskReminders] = useState(false);
  const [stellaAlerts, setStellaAlerts] = useState(true);

  useEffect(() => {
    loadNotificationSettings().then(s => {
      setMinutesBefore(s.minutesBefore);
      setPushNotifs(s.pushNotifs);
      setTaskReminders(s.taskReminders);
      setStellaAlerts(s.stellaAlerts);
    });
  }, []);

  async function handleMinutesChange(m: number) {
    setMinutesBefore(m);
    await saveNotificationSettings({ minutesBefore: m });
  }

  async function handleNotifToggle(
    key: 'pushNotifs' | 'taskReminders' | 'stellaAlerts',
    value: boolean,
  ) {
    switch (key) {
      case 'pushNotifs': setPushNotifs(value); break;
      case 'taskReminders': setTaskReminders(value); break;
      case 'stellaAlerts': setStellaAlerts(value); break;
    }
    await saveNotificationSettings({ [key]: value });
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

  function handleGooglePress() {
    if (googleEmail) {
      Alert.alert(
        'Desconectar Google Calendar',
        `¿Desconectar la cuenta ${googleEmail}?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Desconectar',
            style: 'destructive',
            onPress: async () => {
              try {
                await api.disconnectGoogle();
                setGoogleEmail(null);
              } catch (e) {
                Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo desconectar');
              }
            },
          },
        ],
      );
    } else {
      connectGoogleCalendar();
    }
  }

  async function handleExport() {
    setExporting(true);
    try {
      const data = await api.exportData();
      const json = JSON.stringify(data, null, 2);
      await Share.share({
        title: `delvo-export-${new Date().toISOString().slice(0, 10)}.json`,
        message: json,
      });
    } catch (e) {
      if (e instanceof Error && e.message !== 'The user did not share') {
        Alert.alert('Error', 'No se pudieron exportar los datos');
      }
    } finally {
      setExporting(false);
    }
  }

  function handleDeleteAccount() {
    Alert.alert(
      'Eliminar cuenta',
      'Esta acción es irreversible. Se eliminarán todos tus datos permanentemente.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              await api.deleteAccount();
              await logout();
            } catch (e) {
              Alert.alert('Error', e instanceof Error ? e.message : 'No se pudo eliminar la cuenta');
            }
          },
        },
      ],
    );
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
        <Text style={[styles.profileEmail, { color: c.onSurfaceMuted }]}>{user?.email ?? ''}</Text>
      </View>

      <SectionLabel text="CUENTA" c={c} />
      <View style={[styles.card, { backgroundColor: c.surface }]}>
        <AccountRow label="Información personal" c={c} onPress={() => navigation.navigate('PersonalInfo')} />
        <View style={[styles.divider, { backgroundColor: c.outline }]} />
        <AccountRow label="Seguridad y contraseña" c={c} isLast onPress={() => navigation.navigate('Security')} />
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
            <Text style={[styles.integrationItemSub, { color: googleEmail ? '#22c55e' : c.onSurfaceMuted }]}>
              {googleEmail ? `• ${googleEmail}` : 'Sincroniza tareas y reuniones automáticamente.'}
            </Text>
          </View>
          {connecting ? (
            <ActivityIndicator size="small" color="#4285F4" />
          ) : googleEmail ? (
            <TouchableOpacity
              style={[styles.connectBtn, { borderColor: c.error }]}
              onPress={handleGooglePress}
            >
              <Text style={[styles.connectBtnText, { color: c.error }]}>Desconectar</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.connectBtn, { borderColor: '#4285F4' }]}
              onPress={handleGooglePress}
            >
              <Text style={[styles.connectBtnText, { color: '#4285F4' }]}>Conectar</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <SectionLabel text="NOTIFICACIONES" c={c} />
      <View style={[styles.card, { backgroundColor: c.surface }]}>
        <NotifRow label="Notificaciones push" value={pushNotifs} onChange={v => handleNotifToggle('pushNotifs', v)} c={c} />
        <View style={[styles.divider, { backgroundColor: c.outline }]} />
        <NotifRow label="Recordatorios de tareas" value={taskReminders} onChange={v => handleNotifToggle('taskReminders', v)} c={c} />
        <View style={[styles.divider, { backgroundColor: c.outline }]} />
        <NotifRow label="Alertas de Stella IA" value={stellaAlerts} onChange={v => handleNotifToggle('stellaAlerts', v)} c={c} isLast />
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
            {(['Light', 'Dark', 'System'] as const).map(label => {
              const val = label.toLowerCase() as ThemeMode;
              return (
                <TouchableOpacity
                  key={label}
                  onPress={() => setMode(val)}
                  style={[styles.themeOption, mode === val && { backgroundColor: c.surface }]}
                >
                  <Text style={[
                    styles.themeOptionText,
                    { color: mode === val ? c.onSurface : c.onSurfaceMuted },
                    mode === val && { fontWeight: '700' },
                  ]}>
                    {label === 'Light' ? 'Claro' : label === 'Dark' ? 'Oscuro' : 'Sistema'}
                  </Text>
                </TouchableOpacity>
              );
            })}
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

      <SectionLabel text="DATOS" c={c} />
      <View style={[styles.card, { backgroundColor: c.surface }]}>
        <TouchableOpacity
          style={[styles.dataRow, { opacity: exporting ? 0.6 : 1 }]}
          onPress={handleExport}
          disabled={exporting}
        >
          {exporting ? (
            <ActivityIndicator size="small" color={c.primary} style={{ marginRight: 12 }} />
          ) : (
            <View style={[styles.dataIcon, { backgroundColor: c.primaryMuted }]}>
              <Text style={{ fontSize: 14 }}>↓</Text>
            </View>
          )}
          <View style={{ flex: 1 }}>
            <Text style={[styles.dataRowLabel, { color: c.onSurface }]}>Exportar datos</Text>
            <Text style={[styles.dataRowSub, { color: c.onSurfaceMuted }]}>
              Descarga un JSON con todas tus tareas, eventos, notas y reuniones
            </Text>
          </View>
          <IconChevronRight size={18} color={c.onSurfaceMuted} />
        </TouchableOpacity>
        <View style={[styles.divider, { backgroundColor: c.outline }]} />
        <TouchableOpacity style={styles.dataRow} onPress={handleDeleteAccount}>
          <View style={[styles.dataIcon, { backgroundColor: '#ef444420' }]}>
            <Text style={{ fontSize: 14 }}>🗑</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.dataRowLabel, { color: c.error }]}>Eliminar cuenta</Text>
            <Text style={[styles.dataRowSub, { color: c.onSurfaceMuted }]}>
              Acción irreversible - elimina todos tus datos
            </Text>
          </View>
          <IconChevronRight size={18} color={c.onSurfaceMuted} />
        </TouchableOpacity>
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
  onPress,
}: {
  label: string;
  c: ReturnType<typeof useColors>;
  isLast?: boolean;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity style={[styles.accountRow, isLast && { borderBottomWidth: 0 }]} onPress={onPress}>
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
  profileEmail: { fontSize: 13, marginTop: 2 },

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
  themeOption: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 9 },
  themeOptionText: { fontSize: 12 },
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

  dataRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  dataIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dataRowLabel: { fontSize: 15, fontWeight: '600' },
  dataRowSub: { fontSize: 12, marginTop: 2 },

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
