import React, { useCallback, useMemo, useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import {
  IconCheck,
  IconVideo,
  IconCalendar,
  IconNotes,
  IconChevronRight,
  IconMapPin,
  IconBuildingCommunity,
} from '@tabler/icons-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, EventDto, MeetingDto, NoteDto, TaskDto } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { useColors } from '../theme/ThemeContext';
import { StellaFAB } from '../components/StellaFAB';
import { scheduleEventReminders } from '../notifications/NotificationService';
import { loadNotificationSettings } from '../notifications/NotificationSettings';

interface Summary {
  tasks: number;
  meetings: number;
  events: number;
  notes: number;
}

interface AgendaItem {
  date: string;
  time?: string;
  label: string;
  location?: string;
  type: 'meeting' | 'event';
}

function greeting(): string {
  const h = new Date().getHours();
  if (h >= 6 && h < 13) return 'Buenos días';
  if (h >= 14 && h < 20) return 'Buenas tardes';
  return 'Buenas noches';
}

function toISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function buildGrid(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const dow = first.getDay();
  const shift = dow === 0 ? 6 : dow - 1;
  const start = new Date(year, month, 1 - shift);
  return Array.from({ length: 35 }, (_, i) =>
    new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
}

function chunk<T>(arr: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

function formatDueDate(dateStr: string): string {
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().split('T')[0];
  if (dateStr === today) return 'Vence hoy';
  if (dateStr === tomorrow) return 'Vence mañana';
  return `Vence el ${new Date(dateStr + 'T12:00:00').toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}`;
}

function dedupEvents(events: EventDto[]): EventDto[] {
  const seen = new Set<string>();
  return events.filter((e) => {
    const sig = `${e.title.trim().toLowerCase()}|${(e.event_date ?? '').slice(0, 10)}`;
    if (seen.has(sig)) return false;
    seen.add(sig);
    return true;
  });
}

function buildAgenda(meetings: MeetingDto[], events: EventDto[]): AgendaItem[] {
  const today = new Date().toISOString().split('T')[0];
  const items: AgendaItem[] = [];
  for (const m of meetings) {
    if (m.meeting_date >= today)
      items.push({
        date: m.meeting_date,
        time: m.meeting_time ?? undefined,
        label: m.title,
        location: m.location ?? undefined,
        type: 'meeting',
      });
  }
  for (const e of events) {
    if (e.event_date >= today)
      items.push({
        date: e.event_date,
        time: e.event_time ?? undefined,
        label: e.title,
        location: e.location ?? undefined,
        type: 'event',
      });
  }
  return items.sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5);
}

function priorityColor(priority: string, c: ReturnType<typeof useColors>) {
  if (priority === 'high') return c.high;
  if (priority === 'medium') return c.medium;
  return c.low;
}

const CAL_WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];

export function HomeScreen() {
  const { user } = useAuth();
  const c = useColors();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const now = new Date();

  const [summary, setSummary] = useState<Summary>({ tasks: 0, meetings: 0, events: 0, notes: 0 });
  const [pendingTasks, setPendingTasks] = useState<TaskDto[]>([]);
  const [agenda, setAgenda] = useState<AgendaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [completingTaskId, setCompletingTaskId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [calYear] = useState(now.getFullYear());
  const [calMonth] = useState(now.getMonth());
  const calGrid = useMemo(() => buildGrid(calYear, calMonth), [calYear, calMonth]);
  const today = toISO(now);

  const monthLabel = new Date(calYear, calMonth, 1).toLocaleString('es-ES', {
    month: 'long',
    year: 'numeric',
  });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [tasks, meetings, events, notes] = await Promise.all([
        api.listTasks(),
        api.listMeetings(),
        api.listEvents(),
        api.listNotes(),
      ]);
      const dedupedEvents = dedupEvents(events.items);
      setSummary({
        tasks: tasks.items.length,
        meetings: meetings.items.length,
        events: dedupedEvents.length,
        notes: (notes as { items: NoteDto[] }).items.length,
      });
      setPendingTasks(tasks.items.filter((t) => t.status === 'pending'));
      setAgenda(buildAgenda(meetings.items, dedupedEvents));
      loadNotificationSettings().then(s => {
        if (s.taskReminders) {
          scheduleEventReminders(dedupedEvents, tasks.items).catch(() => {});
        }
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cargar los datos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const visibleTasks = pendingTasks.slice(0, 4);

  async function completeTask(task: TaskDto) {
    if (completingTaskId) return;
    setCompletingTaskId(task.id);
    setError(null);
    setPendingTasks(prev => prev.filter(t => t.id !== task.id));
    setSummary(prev => ({ ...prev, tasks: Math.max(prev.tasks - 1, 0) }));
    try {
      await api.updateTask(task.id, {
        title: task.title,
        description: task.description ?? null,
        due_date: task.due_date ?? null,
        due_time: task.due_time ?? null,
        priority: task.priority,
        status: 'done',
      });
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al completar la tarea.');
      await load();
    } finally {
      setCompletingTaskId(null);
    }
  }

  const METRICS = [
    { label: 'Tareas', value: summary.tasks, icon: <IconCheck size={20} color={c.primary} />, accent: c.primary },
    { label: 'Reuniones', value: summary.meetings, icon: <IconVideo size={20} color={c.secondary} />, accent: c.secondary },
    { label: 'Eventos', value: summary.events, icon: <IconCalendar size={20} color={c.medium} />, accent: c.medium },
    { label: 'Notas', value: summary.notes, icon: <IconNotes size={20} color={c.onSurfaceMuted} />, accent: c.onSurfaceMuted },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 8 }]}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={c.primary} />}
      >
        <View style={styles.greetingSection}>
          <Text style={[styles.greetingText, { color: c.onSurface }]}>
            {greeting()}{user?.name ? `, ${user.name.split(' ')[0]}.` : '.'}
          </Text>
          <Text style={[styles.greetingSub, { color: c.onSurfaceMuted }]}>
            Aquí tienes un resumen de tu espacio de trabajo.
          </Text>
        </View>

        <View style={styles.metricsGrid}>
          {METRICS.map((item) => (
            <View key={item.label} style={[styles.metricTile, { backgroundColor: c.surface }]}>
              <View style={styles.metricTopRow}>
                <Text style={[styles.metricLabel, { color: c.onSurfaceMuted }]}>{item.label}</Text>
                {item.icon}
              </View>
              <Text style={[styles.metricValue, { color: c.onSurface }]}>
                {loading ? '—' : String(item.value)}
              </Text>
              <View style={[styles.metricUnderline, { backgroundColor: item.accent }]} />
            </View>
          ))}
        </View>

        {error ? (
          <View style={[styles.errorBanner, { backgroundColor: c.surface, borderColor: c.error }]}>
            <Text style={[styles.errorText, { color: c.error }]} numberOfLines={2}>{error}</Text>
            <TouchableOpacity onPress={load} style={[styles.retryBtn, { backgroundColor: c.primaryMuted }]}>
              <Text style={[styles.retryText, { color: c.primary }]}>Reintentar</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.sectionHeaderRow}>
          <Text style={[styles.sectionHeader, { color: c.onSurface }]}>Tareas pendientes</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate('Tasks' as never)}
            style={styles.viewAllBtn}
          >
            <Text style={[styles.viewAllText, { color: c.primary }]}>Ver todas</Text>
            <IconChevronRight size={14} color={c.primary} />
          </TouchableOpacity>
        </View>

        {pendingTasks.length === 0 && !loading ? (
          <View style={[styles.emptyRow, { backgroundColor: c.surface }]}>
            <Text style={[styles.emptyText, { color: c.onSurfaceMuted }]}>Sin tareas pendientes</Text>
          </View>
        ) : (
          <>
            {visibleTasks.map((task) => (
              <View key={task.id} style={[styles.taskRow, { backgroundColor: c.surface }]}>
                <TouchableOpacity
                  style={[
                    styles.taskCheckCircle,
                    { borderColor: priorityColor(task.priority, c), opacity: completingTaskId === task.id ? 0.5 : 1 },
                  ]}
                  onPress={() => completeTask(task)}
                  disabled={completingTaskId === task.id}
                  hitSlop={10}
                  activeOpacity={0.7}
                >
                  {completingTaskId === task.id ? (
                    <IconCheck size={14} color={priorityColor(task.priority, c)} />
                  ) : null}
                </TouchableOpacity>
                <View style={styles.taskContent}>
                  <Text style={[styles.taskTitle, { color: c.onSurface }]} numberOfLines={1}>
                    {task.title}
                  </Text>
                  <Text style={[styles.taskDue, { color: c.onSurfaceMuted }]}>
                    {task.due_date ? formatDueDate(task.due_date) : 'Sin fecha límite'}
                  </Text>
                </View>
                <View style={[styles.badge, {
                  backgroundColor: priorityColor(task.priority, c) + '25',
                }]}>
                  <Text style={[styles.badgeText, { color: priorityColor(task.priority, c) }]}>
                    {task.priority === 'high' ? 'ALTA' : task.priority === 'medium' ? 'MEDIA' : 'BAJA'}
                  </Text>
                </View>
              </View>
            ))}
            {pendingTasks.length > 4 && (
              <TouchableOpacity
                onPress={() => navigation.navigate('Tasks' as never)}
                style={styles.showMore}
              >
                <Text style={[styles.showMoreText, { color: c.primary }]}>
                  Ver {pendingTasks.length - 4} más
                </Text>
              </TouchableOpacity>
            )}
          </>
        )}

        <Text style={[styles.sectionHeader, { color: c.onSurface, marginTop: 4 }]}>Agenda</Text>

        {agenda.length === 0 && !loading ? (
          <View style={[styles.emptyRow, { backgroundColor: c.surface }]}>
            <Text style={[styles.emptyText, { color: c.onSurfaceMuted }]}>Sin próximos eventos</Text>
          </View>
        ) : (
          agenda.map((item, i) => {
            const dateStr = new Date(`${item.date}T12:00:00`).toLocaleDateString('es-ES', {
              month: '2-digit',
              day: '2-digit',
            });
            const timeStr = item.time
              ? new Date(`1970-01-01T${item.time}`).toLocaleTimeString('es-ES', {
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: false,
                })
              : 'Sin hora';
            return (
              <View key={i} style={[styles.agendaRow, { backgroundColor: c.surface }]}>
                <View style={styles.agendaTimeCol}>
                  <Text style={[styles.agendaDate, { color: c.onSurface }]}>{dateStr}</Text>
                  <Text style={[styles.agendaTime, { color: c.onSurfaceMuted }]}>{timeStr}</Text>
                </View>
                <View style={styles.agendaInfo}>
                  <Text style={[styles.agendaTitle, { color: c.onSurface }]} numberOfLines={1}>
                    {item.label}
                  </Text>
                  {item.location ? (
                    <View style={styles.agendaLocationRow}>
                      {item.type === 'meeting'
                        ? <IconBuildingCommunity size={11} color={c.onSurfaceMuted} />
                        : <IconMapPin size={11} color={c.onSurfaceMuted} />
                      }
                      <Text style={[styles.agendaLocation, { color: c.onSurfaceMuted }]} numberOfLines={1}>
                        {item.location}
                      </Text>
                    </View>
                  ) : (
                    <Text style={[styles.agendaType, { color: item.type === 'meeting' ? c.primary : c.medium }]}>
                      {item.type === 'meeting' ? 'Reunión' : 'Evento'}
                    </Text>
                  )}
                </View>
              </View>
            );
          })
        )}

        <View style={styles.bottomPad} />
      </ScrollView>
      <StellaFAB />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 12 },

  greetingSection: { marginBottom: 4 },
  greetingText: { fontSize: 28, fontWeight: '800', lineHeight: 34 },
  greetingSub: { fontSize: 14, marginTop: 4 },

  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metricTile: {
    width: '47.5%',
    borderRadius: 18,
    padding: 16,
    gap: 4,
    overflow: 'hidden',
  },
  metricTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metricLabel: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  metricValue: { fontSize: 40, fontWeight: '800', lineHeight: 48 },
  metricUnderline: { height: 3, borderRadius: 2, width: '100%' },

  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionHeader: { fontSize: 17, fontWeight: '700' },
  viewAllBtn: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  viewAllText: { fontSize: 13, fontWeight: '600' },

  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 12,
  },
  taskCheckCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskContent: { flex: 1, gap: 2 },
  taskTitle: { fontSize: 14, fontWeight: '600' },
  taskDue: { fontSize: 12 },
  badge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.3 },

  showMore: { alignItems: 'center', paddingVertical: 6 },
  showMoreText: { fontSize: 13, fontWeight: '600' },

  miniCalCard: { borderRadius: 18, padding: 14 },
  miniCalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  miniCalTitle: { fontSize: 14, fontWeight: '700' },
  miniCalNav: { flexDirection: 'row', gap: 6 },
  miniCalNavBtn: { padding: 2 },
  miniCalArrow: { fontSize: 16 },
  miniCalWeekRow: { flexDirection: 'row' },
  miniCalWeekDay: { flex: 1, textAlign: 'center', fontSize: 10, fontWeight: '600', paddingVertical: 4 },
  miniCalDay: {
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    margin: 1,
  },
  miniCalDayNum: { fontSize: 12 },

  agendaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 14,
  },
  agendaTimeCol: { width: 68, alignItems: 'flex-end', gap: 2 },
  agendaDate: { fontSize: 13, fontWeight: '700' },
  agendaTime: { fontSize: 11, fontWeight: '600' },
  agendaInfo: { flex: 1 },
  agendaTitle: { fontSize: 14, fontWeight: '600' },
  agendaLocationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  agendaLocation: { fontSize: 12, flex: 1 },
  agendaType: { fontSize: 12, marginTop: 2 },

  emptyRow: { borderRadius: 14, paddingHorizontal: 14, paddingVertical: 14 },
  emptyText: { fontSize: 14 },

  errorBanner: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  errorText: { flex: 1, fontSize: 13 },
  retryBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  retryText: { fontSize: 12, fontWeight: '700' },

  bottomPad: { height: 8 },
});
