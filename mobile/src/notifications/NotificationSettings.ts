import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'delvo_notif_settings';

export interface NotificationSettings {
  minutesBefore: number;
}

const DEFAULT: NotificationSettings = { minutesBefore: 30 };

export const MINUTES_OPTIONS = [5, 10, 15, 30, 60, 120] as const;

export async function loadNotificationSettings(): Promise<NotificationSettings> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? { ...DEFAULT, ...JSON.parse(raw) } : DEFAULT;
  } catch {
    return DEFAULT;
  }
}

export async function saveNotificationSettings(s: NotificationSettings): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(s));
}
