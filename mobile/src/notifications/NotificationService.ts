import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { api, EventDto, TaskDto } from '../api/client';
import { loadNotificationSettings } from './NotificationSettings';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestPermissionsAndRegisterToken(): Promise<string | null> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('reminders', {
      name: 'Recordatorios',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#6C63FF',
    });
  }

  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') return null;

  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId });
    const token = tokenData.data;
    console.log('[Push] Token obtenido:', token);
    await api.registerPushToken(token);
    console.log('[Push] Token registrado en backend');
    return token;
  } catch (e) {
    console.error('[Push] Error al obtener/registrar token:', e);
    return null;
  }
}

function buildTriggerDate(dateStr: string, minutesBefore: number, timeStr?: string | null): Date | null {
  try {
    const base = timeStr
      ? new Date(`${dateStr}T${timeStr}`)
      : new Date(`${dateStr}T09:00:00`);
    if (isNaN(base.getTime())) return null;
    return new Date(base.getTime() - minutesBefore * 60 * 1000);
  } catch {
    return null;
  }
}

export async function scheduleEventReminders(
  events: EventDto[],
  tasks: TaskDto[],
): Promise<void> {
  const { minutesBefore } = await loadNotificationSettings();
  await Notifications.cancelAllScheduledNotificationsAsync();

  const now = Date.now();
  const scheduled: Promise<string>[] = [];

  for (const ev of events) {
    const trigger = buildTriggerDate(ev.event_date, minutesBefore, ev.event_time);
    if (!trigger || trigger.getTime() <= now) continue;
    scheduled.push(
      Notifications.scheduleNotificationAsync({
        content: {
          title: ev.title,
          body: `Evento en ${minutesBefore} minutos`,
          data: { type: 'event', id: ev.id },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: trigger },
      }),
    );
  }

  for (const task of tasks) {
    if (!task.due_date || task.status === 'done') continue;
    const trigger = buildTriggerDate(task.due_date, minutesBefore, task.due_time);
    if (!trigger || trigger.getTime() <= now) continue;
    scheduled.push(
      Notifications.scheduleNotificationAsync({
        content: {
          title: task.title,
          body: `Tarea vence en ${minutesBefore} minutos`,
          data: { type: 'task', id: task.id },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: trigger },
      }),
    );
  }

  await Promise.allSettled(scheduled);
}
