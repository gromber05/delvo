import React, { useCallback, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { IconPlus } from '@tabler/icons-react-native';
import { api, EventDto, MeetingDto, NoteDto, TaskDto } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { useColors } from '../theme/ThemeContext';
import { StellaFAB } from '../components/StellaFAB';

interface Summary {
  tasks: number;
  meetings: number;
  events: number;
  notes: number;
}

interface AgendaItem {
  date: string;
  label: string;
  type: 'meeting' | 'event';
}

function greeting(): string {
  const h = new Date().getHours();
  if (h >= 6 && h < 13) return 'Buenos días';
  if (h >= 14 && h < 20) return 'Buenas tardes';
  return 'Buenas noches';
}

function todayLabel(): string {
  return new Date().toLocaleDateString('es-ES', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
}

function dedupEvents(events: EventDto[]): EventDto[] {
// Eliminar eventos duplicados (mismo título+fecha): un evento de Delvo y su copia
// sincronizada de Google pueden coexistir localmente. 
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
      items.push({ date: m.meeting_date, label: m.title, type: 'meeting' });
  }
  for (const e of events) {
    if (e.event_date >= today)
      items.push({ date: e.event_date, label: e.title, type: 'event' });
  }
  return items.sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5);
}

function priorityColor(priority: string, c: ReturnType<typeof useColors>) {
  if (priority === 'high') return c.high;
  if (priority === 'medium') return c.medium;
  return c.low;
}

export function HomeScreen() {
  const { user } = useAuth();
  const c = useColors();
  const navigation = useNavigation();

  const [summary, setSummary] = useState<Summary>({ tasks: 0, meetings: 0, events: 0, notes: 0 });
  const [pendingTasks, setPendingTasks] = useState<TaskDto[]>([]);
  const [agenda, setAgenda] = useState<AgendaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAllTasks, setShowAllTasks] = useState(false);

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
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cargar datos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const visibleTasks = showAllTasks ? pendingTasks : pendingTasks.slice(0, 4);

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={c.primary} />}
    >
      {}
      <View style={styles.greetingSection}>
        <Text style={[styles.greetingText, { color: c.onSurface }]}>
          {greeting()}{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
        </Text>
        <Text style={[styles.dateText, { color: c.onSurfaceMuted }]}>{todayLabel()}</Text>
      </View>

      {}
      <View style={styles.metricsGrid}>
        {[
          { label: 'Tareas', value: summary.tasks, accent: c.primary },
          { label: 'Reuniones', value: summary.meetings, accent: c.secondary },
          { label: 'Eventos', value: summary.events, accent: c.medium },
          { label: 'Notas', value: summary.notes, accent: c.onSurfaceMuted },
        ].map((item) => (
          <View key={item.label} style={[styles.metricTile, { backgroundColor: c.surface }]}>
            <View style={[styles.metricAccent, { backgroundColor: item.accent }]} />
            <Text style={[styles.metricValue, { color: c.onSurface }]}>
              {loading ? '—' : String(item.value)}
            </Text>
            <Text style={[styles.metricLabel, { color: c.onSurfaceMuted }]}>{item.label}</Text>
          </View>
        ))}
      </View>

      {}
      {error ? <Text style={[styles.errorText, { color: c.error }]}>{error}</Text> : null}

      {}
      <View style={styles.sectionHeaderRow}>
        <SectionHeader title="Pendientes" color={c.onSurfaceMuted} />
        <TouchableOpacity onPress={() => navigation.navigate('Create' as never)} style={[styles.createBtn, { backgroundColor: c.primaryMuted }]}>
          <IconPlus size={14} color={c.primary} />
          <Text style={[styles.createBtnText, { color: c.primary }]}>Crear</Text>
        </TouchableOpacity>
      </View>

      {pendingTasks.length === 0 && !loading ? (
        <EmptyRow label="Sin tareas pendientes" color={c.onSurfaceMuted} bg={c.surface} />
      ) : (
        <>
          {visibleTasks.map((task) => (
            <View key={task.id} style={[styles.taskRow, { backgroundColor: c.surface }]}>
              <View style={[styles.priorityDot, { backgroundColor: priorityColor(task.priority, c) }]} />
              <Text style={[styles.taskTitle, { color: c.onSurface }]} numberOfLines={1}>
                {task.title}
              </Text>
              <View style={[styles.badge, { backgroundColor: c.primaryMuted }]}>
                <Text style={[styles.badgeText, { color: c.primary }]}>
                  {task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Media' : 'Baja'}
                </Text>
              </View>
            </View>
          ))}
          {pendingTasks.length > 4 && (
            <TouchableOpacity onPress={() => setShowAllTasks((v) => !v)} style={styles.showMore}>
              <Text style={[styles.showMoreText, { color: c.primary }]}>
                {showAllTasks ? 'Ver menos' : `Ver ${pendingTasks.length - 4} más`}
              </Text>
            </TouchableOpacity>
          )}
        </>
      )}

      {}
      <SectionHeader title="Agenda próxima" color={c.onSurfaceMuted} />

      {agenda.length === 0 && !loading ? (
        <EmptyRow label="Sin eventos próximos" color={c.onSurfaceMuted} bg={c.surface} />
      ) : (
        agenda.map((item, i) => (
          <View key={i} style={[styles.agendaRow, { backgroundColor: c.surface }]}>
            <View style={[styles.agendaDateChip, { backgroundColor: c.primaryMuted }]}>
              <Text style={[styles.agendaDateText, { color: c.primary }]}>
                {item.date.slice(5)}
              </Text>
            </View>
            <View style={styles.agendaInfo}>
              <Text style={[styles.agendaTitle, { color: c.onSurface }]} numberOfLines={1}>
                {item.label}
              </Text>
              <Text style={[styles.agendaType, { color: c.onSurfaceMuted }]}>
                {item.type === 'meeting' ? 'Reunión' : 'Evento'}
              </Text>
            </View>
          </View>
        ))
      )}

      <View style={styles.bottomPad} />
    </ScrollView>
    <StellaFAB />
    </View>
  );
}

function SectionHeader({ title, color }: { title: string; color: string }) {
  return (
    <Text style={[styles.sectionHeader, { color }]}>{title.toUpperCase()}</Text>
  );
}

function EmptyRow({ label, color, bg }: { label: string; color: string; bg: string }) {
  return (
    <View style={[styles.emptyRow, { backgroundColor: bg }]}>
      <Text style={[styles.emptyText, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 10 },
  
  greetingSection: { marginBottom: 6 },
  greetingText: { fontSize: 26, fontWeight: '800', lineHeight: 32 },
  dateText: { fontSize: 14, marginTop: 4, textTransform: 'capitalize' },
  
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metricTile: {
    width: '47.5%',
    borderRadius: 16,
    padding: 16,
    overflow: 'hidden',
    gap: 2,
  },
  metricAccent: { position: 'absolute', top: 0, left: 0, right: 0, height: 3, borderTopLeftRadius: 16, borderTopRightRadius: 16 },
  metricValue: { fontSize: 36, fontWeight: '800', marginTop: 10 },
  metricLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8 },
  
  sectionHeader: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2, marginTop: 8, marginBottom: 2 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  createBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
  createBtnText: { fontSize: 12, fontWeight: '600' },
  
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  priorityDot: { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  taskTitle: { flex: 1, fontSize: 14, fontWeight: '500' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  showMore: { alignItems: 'center', paddingVertical: 6 },
  showMoreText: { fontSize: 13, fontWeight: '600' },
  
  agendaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  agendaDateChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  agendaDateText: { fontSize: 12, fontWeight: '700' },
  agendaInfo: { flex: 1 },
  agendaTitle: { fontSize: 14, fontWeight: '500' },
  agendaType: { fontSize: 12, marginTop: 1 },
  
  emptyRow: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14 },
  emptyText: { fontSize: 14 },
  errorText: { fontSize: 13 },
  bottomPad: { height: 8 },
});
