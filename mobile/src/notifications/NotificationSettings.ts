import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'delvo_notif_settings';

export interface NotificationSettings {
  minutesBefore: number;
  pushNotifs: boolean;
  taskReminders: boolean;
  stellaAlerts: boolean;
}

const DEFAULT: NotificationSettings = {
  minutesBefore: 30,
  pushNotifs: true,
  taskReminders: false,
  stellaAlerts: true,
};

export const MINUTES_OPTIONS = [5, 10, 15, 30, 60, 120] as const;

export async function loadNotificationSettings(): Promise<NotificationSettings> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? { ...DEFAULT, ...JSON.parse(raw) } : DEFAULT;
  } catch {
    return DEFAULT;
  }
}

export async function saveNotificationSettings(s: Partial<NotificationSettings>): Promise<void> {
  const current = await loadNotificationSettings();
  await AsyncStorage.setItem(KEY, JSON.stringify({ ...current, ...s }));
}
