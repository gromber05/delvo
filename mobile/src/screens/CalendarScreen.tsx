import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { IconPlus } from '@tabler/icons-react-native';
import { api, EventDto, GoogleCalendarEvent, MeetingDto, TaskDto } from '../api/client';
import { useColors } from '../theme/ThemeContext';
import { StellaFAB } from '../components/StellaFAB';
import { scheduleEventReminders } from '../notifications/NotificationService';

const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const MONTH_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

type Priority = 'low' | 'medium' | 'high';
type TaskStatus = 'pending' | 'in_progress' | 'done';

interface CalendarEntry {
  id: string;
  type: 'event' | 'meeting' | 'task' | 'gcal';
  rawId: number;
  gcalId?: string;
  title: string;
  date: string;
  time: string;
  priority?: Priority;
  status?: TaskStatus;
  taskData?: TaskDto;
}

function toISO(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function buildGrid(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const dow = first.getDay();
  const shift = dow === 0 ? 6 : dow - 1;
  const start = new Date(year, month, 1 - shift);
  return Array.from({ length: 42 }, (_, i) =>
    new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
}

function fmtMonthYear(y: number, m: number) {
  return new Date(y, m, 1).toLocaleString('es-ES', { month: 'long', year: 'numeric' });
}

function chunk<T>(arr: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

const PRIORITY_COLORS: Record<Priority, string> = {
  high: '#F44336',
  medium: '#FFC107',
  low: '#4CAF50',
};

const PRIORITY_LABEL: Record<Priority, string> = {
  high: 'Alta',
  medium: 'Media',
  low: 'Baja',
};

export function CalendarScreen() {
  const c = useColors();
  const navigation = useNavigation();
  const now = new Date();

  const [events, setEvents] = useState<EventDto[]>([]);
  const [meetings, setMeetings] = useState<MeetingDto[]>([]);
  const [tasks, setTasks] = useState<TaskDto[]>([]);
  const [gcalEvents, setGcalEvents] = useState<GoogleCalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selected, setSelected] = useState(toISO(now));

  
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerYear, setPickerYear] = useState(now.getFullYear());

  
  const [editTarget, setEditTarget] = useState<CalendarEntry | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  
  const [completing, setCompleting] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [ev, mt, tk] = await Promise.all([
        api.listEvents(),
        api.listMeetings(),
        api.listTasks(),
      ]);
      setEvents(ev.items);
      setMeetings(mt.items);
      setTasks(tk.items);
      scheduleEventReminders(ev.items, tk.items).catch(() => {});
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cargar.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadGcal = useCallback(async (y: number, m: number) => {
    const timeMin = new Date(y, m - 1, 1).toISOString();
    const timeMax = new Date(y, m + 2, 0, 23, 59, 59).toISOString();
    try {
      const res = await api.listGoogleCalendarEvents({ time_min: timeMin, time_max: timeMax, max_results: 100 });
      setGcalEvents(res.events);
    } catch {
      
    }
  }, []);

  useFocusEffect(useCallback(() => {
    load();
    loadGcal(year, month);
  }, [load, loadGcal, year, month]));

  
  React.useEffect(() => { loadGcal(year, month); }, [year, month, loadGcal]);

  const entries: CalendarEntry[] = useMemo(() => {
    const userEvents = events.filter(e => e.event_type !== 'google_calendar');
    const linkedGcalIds = new Set(
      userEvents.map(e => e.gcal_event_id).filter((x): x is string => !!x),
    );
    const localEventSignatures = new Set(
      userEvents.map(e => `${e.title.trim().toLowerCase()}|${e.event_date}`),
    );

    return [
      ...events
        .filter(e => e.event_type !== 'google_calendar')
        .map(e => ({
          id: `ev-${e.id}`,
          type: 'event' as const,
          rawId: e.id,
          title: e.title,
          date: e.event_date,
          time: e.event_time ?? '',
        })),
      ...meetings.map(m => ({
        id: `mt-${m.id}`,
        type: 'meeting' as const,
        rawId: m.id,
        title: m.title,
        date: m.meeting_date,
        time: m.meeting_time,
      })),
      ...tasks
        .filter(t => !!t.due_date)
        .map(t => ({
          id: `tk-${t.id}`,
          type: 'task' as const,
          rawId: t.id,
          title: t.title,
          date: t.due_date!,
          time: t.due_time ?? '',
          priority: (t.priority as Priority) ?? 'medium',
          status: (t.status as TaskStatus) ?? 'pending',
          taskData: t,
        })),
      ...gcalEvents
        .filter(g => {
          if (linkedGcalIds.has(g.id)) return false;
          const dateStr = g.start.dateTime ? g.start.dateTime.split('T')[0] : (g.start.date ?? '');
          const sig = `${(g.summary ?? '').trim().toLowerCase()}|${dateStr}`;
          return !localEventSignatures.has(sig);
        })
        .map(g => {
          const dateStr = g.start.dateTime
            ? g.start.dateTime.split('T')[0]
            : (g.start.date ?? '');
          const timeStr = g.start.dateTime
            ? new Date(g.start.dateTime).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
            : '';
          return {
            id: `gc-${g.id}`,
            type: 'gcal' as const,
            rawId: 0,
            gcalId: g.id,
            title: g.summary ?? '(sin título)',
            date: dateStr,
            time: timeStr,
          };
        }),
    ];
  }, [events, meetings, tasks, gcalEvents]);

  const countsByDate = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of entries) map[e.date] = (map[e.date] ?? 0) + 1;
    return map;
  }, [entries]);

  const visible = useMemo(() => entries.filter(e => e.date === selected), [entries, selected]);
  const grid = useMemo(() => buildGrid(year, month), [year, month]);
  const today = toISO(now);

  function shiftMonth(dir: number) {
    const d = new Date(year, month + dir, 1);
    setYear(d.getFullYear()); setMonth(d.getMonth());
  }

  function openPicker() { setPickerYear(year); setPickerVisible(true); }

  function selectPickerMonth(m: number) {
    setYear(pickerYear); setMonth(m);
    setPickerVisible(false);
  }

  function openEdit(e: CalendarEntry) {
    setEditTarget(e);
    setEditTitle(e.title);
    setEditDate(e.date);
    setEditTime(e.time);
    setSaveError(null);
  }

  async function saveEdit() {
    if (!editTarget || !editTitle.trim() || !editDate.trim()) return;
    setSaving(true); setSaveError(null);
    try {
      if (editTarget.type === 'gcal' && editTarget.gcalId) {
        const hasTime = !!editTime.trim();
        const normalizeTime = (t: string) => (t.split(':').length === 2 ? `${t}:00` : t);
        const startDt = hasTime
          ? { dateTime: `${editDate.trim()}T${normalizeTime(editTime.trim())}`, timeZone: 'UTC' }
          : { date: editDate.trim() };
        const endDt = hasTime
          ? { dateTime: `${editDate.trim()}T${normalizeTime(editTime.trim())}`, timeZone: 'UTC' }
          : { date: editDate.trim() };
        await api.patchGoogleCalendarEvent(editTarget.gcalId, {
          summary: editTitle.trim(),
          start: startDt,
          end: endDt,
        });
      } else if (editTarget.type === 'event') {
        await api.updateEvent(editTarget.rawId, {
          title: editTitle.trim(),
          event_date: editDate.trim(),
          event_time: editTime.trim() || undefined,
        });
      } else if (editTarget.type === 'meeting') {
        await api.updateMeeting(editTarget.rawId, {
          title: editTitle.trim(),
          meeting_date: editDate.trim(),
          meeting_time: editTime.trim() || '09:00:00',
        });
      } else {
        
        await api.updateTask(editTarget.rawId, {
          title: editTitle.trim(),
          description: editTarget.taskData?.description ?? null,
          due_date: editDate.trim() || null,
          due_time: editTime.trim() || null,
          priority: editTarget.taskData?.priority ?? 'medium',
          status: editTarget.taskData?.status ?? 'pending',
        });
      }
      const wasGcal = editTarget.type === 'gcal';
      setEditTarget(null);
      load();
      if (wasGcal) loadGcal(year, month);
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : 'Error al guardar.');
    } finally {
      setSaving(false);
    }
  }

  async function deleteEntry(entry: CalendarEntry) {
    setDeleting(true); setSaveError(null);
    try {
      if (entry.type === 'event') await api.deleteEvent(entry.rawId);
      else if (entry.type === 'meeting') await api.deleteMeeting(entry.rawId);
      else await api.deleteTask(entry.rawId);
      setEditTarget(null);
      load();
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : 'Error al eliminar.');
    } finally {
      setDeleting(false);
    }
  }

  async function markComplete(entry: CalendarEntry) {
    if (!entry.taskData || entry.status === 'done') return;
    setCompleting(entry.id);
    try {
      await api.updateTask(entry.rawId, {
        title: entry.taskData.title,
        description: entry.taskData.description ?? null,
        due_date: entry.taskData.due_date ?? null,
        due_time: entry.taskData.due_time ?? null,
        priority: entry.taskData.priority,
        status: 'done',
      });
      load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al completar.');
    } finally {
      setCompleting(null);
    }
  }

  function accentColor(entry: CalendarEntry): string {
    if (entry.type === 'task') return PRIORITY_COLORS[entry.priority ?? 'medium'];
    if (entry.type === 'event') return c.medium;
    if (entry.type === 'gcal') return '#4285F4';
    return c.primary;
  }

  function typeLabel(entry: CalendarEntry): string {
    if (entry.type === 'task') return 'Tarea';
    if (entry.type === 'event') return 'Evento';
    if (entry.type === 'gcal') return 'Google';
    return 'Reunión';
  }

  function typeLabelColor(entry: CalendarEntry): string {
    if (entry.type === 'task') return PRIORITY_COLORS[entry.priority ?? 'medium'];
    if (entry.type === 'event') return c.medium;
    if (entry.type === 'gcal') return '#4285F4';
    return c.primary;
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={c.primary} />}
    >
      <View style={[styles.monthNav, { backgroundColor: c.surface }]}>
        <TouchableOpacity onPress={() => shiftMonth(-1)} style={styles.navBtn} hitSlop={8}>
          <Text style={[styles.navArrow, { color: c.primary }]}>‹</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={openPicker} style={styles.monthLabelBtn}>
          <Text style={[styles.monthLabel, { color: c.onSurface }]}>{fmtMonthYear(year, month)}</Text>
          <Text style={[styles.dropChevron, { color: c.primary }]}>⌄</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => shiftMonth(1)} style={styles.navBtn} hitSlop={8}>
          <Text style={[styles.navArrow, { color: c.primary }]}>›</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Create' as never)} style={styles.navBtn} hitSlop={8}>
          <IconPlus size={22} color={c.primary} />
        </TouchableOpacity>
      </View>

      <View style={[styles.grid, { backgroundColor: c.surface }]}>
        <View style={styles.weekRow}>
          {WEEKDAYS.map(d => (
            <Text key={d} style={[styles.weekDay, { color: c.onSurfaceMuted }]}>{d}</Text>
          ))}
        </View>
        {chunk(grid, 7).map((week, wi) => (
          <View key={wi} style={styles.weekRow}>
            {week.map(day => {
              const iso = toISO(day);
              const inMonth = day.getMonth() === month;
              const isSelected = iso === selected;
              const isToday = iso === today;
              const count = countsByDate[iso] ?? 0;
              return (
                <Pressable
                  key={iso}
                  style={[
                    styles.dayCell,
                    { backgroundColor: isSelected ? c.primaryMuted : 'transparent' },
                    isToday && !isSelected && { borderWidth: 1, borderColor: c.primary },
                  ]}
                  onPress={() => setSelected(iso)}
                >
                  <Text style={[
                    styles.dayNum,
                    { color: isSelected ? c.primary : inMonth ? c.onSurface : c.onSurfaceMuted },
                    isToday && { fontWeight: '800' },
                  ]}>
                    {day.getDate()}
                  </Text>
                  {count > 0 && <View style={[styles.dot, { backgroundColor: c.secondary }]} />}
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>

      {error ? <Text style={[styles.error, { color: c.error }]}>{error}</Text> : null}
      {loading && <ActivityIndicator color={c.primary} />}

      <Text style={[styles.sectionHeader, { color: c.onSurfaceMuted }]}>
        {selected === today ? 'HOY' : selected.slice(5).replace('-', '/')}
      </Text>

      {visible.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: c.surface }]}>
          <Text style={[styles.emptyText, { color: c.onSurfaceMuted }]}>Sin elementos este día</Text>
        </View>
      ) : (
        visible.map(entry => (
          <View key={entry.id} style={[styles.entryCard, { backgroundColor: c.surface }]}>
            <View style={[styles.entryAccent, { backgroundColor: accentColor(entry) }]} />
            <View style={styles.entryBody}>
              <View style={styles.entryTopRow}>
                <View style={styles.entryLeftMeta}>
                  <Text style={[styles.entryType, { color: typeLabelColor(entry) }]}>
                    {typeLabel(entry)}
                  </Text>
                  {entry.type === 'task' && entry.priority && (
                    <View style={styles.priorityBadge}>
                      <View style={[styles.priorityDot, { backgroundColor: PRIORITY_COLORS[entry.priority] }]} />
                      <Text style={[styles.priorityText, { color: c.onSurfaceMuted }]}>
                        {PRIORITY_LABEL[entry.priority]}
                      </Text>
                    </View>
                  )}
                  {entry.status === 'done' && (
                    <View style={[styles.doneBadge, { backgroundColor: '#4CAF5020' }]}>
                      <Text style={styles.doneBadgeText}>Completada</Text>
                    </View>
                  )}
                </View>

                <View style={styles.entryActions}>
                  {entry.type === 'task' && entry.status !== 'done' && (
                    <TouchableOpacity
                      onPress={() => markComplete(entry)}
                      disabled={completing === entry.id}
                      style={{ opacity: completing === entry.id ? 0.5 : 1 }}
                    >
                      <Text style={[styles.completeLink, { color: '#4CAF50' }]}>
                        {completing === entry.id ? '...' : 'Completar ✓'}
                      </Text>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity onPress={() => openEdit(entry)}>
                    <Text style={[styles.editLink, { color: c.onSurfaceMuted }]}>Editar</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {}
              <Text style={[
                styles.entryTitle,
                { color: c.onSurface },
                entry.status === 'done' && styles.strikethrough,
              ]}>
                {entry.title}
              </Text>

              {}
              {entry.time ? (
                <Text style={[styles.entryTime, { color: c.onSurfaceMuted }]}>{entry.time}</Text>
              ) : null}
            </View>
          </View>
        ))
      )}

      {}
      <Modal visible={pickerVisible} transparent animationType="fade">
        <Pressable style={styles.overlay} onPress={() => setPickerVisible(false)}>
          <Pressable style={[styles.pickerCard, { backgroundColor: c.surface }]} onPress={() => {}}>
            <View style={styles.pickerYearRow}>
              <TouchableOpacity onPress={() => setPickerYear(y => y - 1)} style={styles.pickerArrowBtn}>
                <Text style={[styles.pickerArrow, { color: c.primary }]}>‹</Text>
              </TouchableOpacity>
              <Text style={[styles.pickerYear, { color: c.onSurface }]}>{pickerYear}</Text>
              <TouchableOpacity onPress={() => setPickerYear(y => y + 1)} style={styles.pickerArrowBtn}>
                <Text style={[styles.pickerArrow, { color: c.primary }]}>›</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.pickerMonthGrid}>
              {MONTH_SHORT.map((label, mi) => {
                const isActive = mi === month && pickerYear === year;
                return (
                  <TouchableOpacity
                    key={label}
                    style={[styles.pickerMonthCell, isActive && { backgroundColor: c.primaryMuted }]}
                    onPress={() => selectPickerMonth(mi)}
                  >
                    <Text style={[
                      styles.pickerMonthText,
                      { color: isActive ? c.primary : c.onSurface },
                      isActive && { fontWeight: '800' },
                    ]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {}
      <Modal visible={editTarget !== null} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={[styles.modalCard, { backgroundColor: c.surface }]}>
            <Text style={[styles.modalTitle, { color: c.onSurface }]}>
              Editar{' '}
              <Text style={[styles.modalTitleType, { color: c.onSurfaceMuted }]}>
                - {editTarget ? typeLabel(editTarget) : ''}
              </Text>
            </Text>

            {}
            <View style={{ gap: 5 }}>
              <Text style={[styles.fieldLabel, { color: c.onSurfaceMuted }]}>Título</Text>
              <TextInput
                style={[styles.input, { backgroundColor: c.surfaceVariant, color: c.onSurface, borderColor: c.outline }]}
                value={editTitle}
                onChangeText={setEditTitle}
                placeholderTextColor={c.onSurfaceMuted}
                editable={!saving && !deleting}
              />
            </View>

            {}
            <View style={{ gap: 5 }}>
              <Text style={[styles.fieldLabel, { color: c.onSurfaceMuted }]}>
                {editTarget?.type === 'task' ? 'Fecha de vencimiento (yyyy-MM-dd)' : 'Fecha (yyyy-MM-dd)'}
              </Text>
              <TextInput
                style={[styles.input, { backgroundColor: c.surfaceVariant, color: c.onSurface, borderColor: c.outline }]}
                value={editDate}
                onChangeText={setEditDate}
                placeholder="2026-05-20"
                placeholderTextColor={c.onSurfaceMuted}
                editable={!saving && !deleting}
              />
            </View>

            {}
            <View style={{ gap: 5 }}>
              <Text style={[styles.fieldLabel, { color: c.onSurfaceMuted }]}>Hora (HH:mm:ss)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: c.surfaceVariant, color: c.onSurface, borderColor: c.outline }]}
                value={editTime}
                onChangeText={setEditTime}
                placeholder="09:00:00"
                placeholderTextColor={c.onSurfaceMuted}
                editable={!saving && !deleting}
              />
            </View>

            {saveError ? (
              <Text style={[styles.saveError, { color: c.error }]}>{saveError}</Text>
            ) : null}

            {}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, { borderColor: c.outline, borderWidth: 1 }]}
                onPress={() => setEditTarget(null)}
                disabled={saving || deleting}
              >
                <Text style={[styles.cancelText, { color: c.onSurface }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: c.primary }, (saving || deleting) && { opacity: 0.6 }]}
                onPress={saveEdit}
                disabled={saving || deleting}
              >
                {saving
                  ? <ActivityIndicator color={c.onPrimary} />
                  : <Text style={[styles.saveText, { color: c.onPrimary }]}>Guardar</Text>}
              </TouchableOpacity>
            </View>

            {}
            {editTarget?.type !== 'gcal' && (
              <TouchableOpacity
                style={[styles.deleteBtn, { borderColor: c.error ?? '#F44336' }, (saving || deleting) && { opacity: 0.5 }]}
                onPress={() => editTarget && deleteEntry(editTarget)}
                disabled={saving || deleting}
              >
                {deleting
                  ? <ActivityIndicator color={c.error ?? '#F44336'} />
                  : <Text style={[styles.deleteText, { color: c.error ?? '#F44336' }]}>Eliminar</Text>}
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>

      <View style={{ height: 16 }} />
    </ScrollView>
    <StellaFAB />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },

  
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 14, paddingHorizontal: 8, paddingVertical: 4 },
  navBtn: { padding: 10 },
  navArrow: { fontSize: 26, lineHeight: 32 },
  monthLabelBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 6, paddingHorizontal: 10 },
  monthLabel: { fontSize: 15, fontWeight: '700', textTransform: 'capitalize' },
  dropChevron: { fontSize: 13, lineHeight: 18 },

  
  grid: { borderRadius: 16, padding: 12, gap: 6 },
  weekRow: { flexDirection: 'row' },
  weekDay: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700', paddingVertical: 4 },
  dayCell: { flex: 1, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 10, margin: 1 },
  dayNum: { fontSize: 13 },
  dot: { width: 4, height: 4, borderRadius: 2, marginTop: 2 },

  
  sectionHeader: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2 },
  emptyCard: { borderRadius: 12, padding: 16 },
  emptyText: { fontSize: 14 },
  entryCard: { flexDirection: 'row', borderRadius: 14, overflow: 'hidden' },
  entryAccent: { width: 4 },
  entryBody: { flex: 1, padding: 14, gap: 4 },
  entryTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  entryLeftMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', flex: 1 },
  entryType: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  priorityBadge: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  priorityDot: { width: 6, height: 6, borderRadius: 3 },
  priorityText: { fontSize: 10 },
  doneBadge: { borderRadius: 10, paddingHorizontal: 7, paddingVertical: 2 },
  doneBadgeText: { fontSize: 10, fontWeight: '700', color: '#4CAF50' },
  entryActions: { flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 0 },
  completeLink: { fontSize: 12, fontWeight: '600' },
  editLink: { fontSize: 12 },
  entryTitle: { fontSize: 15, fontWeight: '600' },
  strikethrough: { textDecorationLine: 'line-through', opacity: 0.5 },
  entryTime: { fontSize: 12 },
  error: { fontSize: 13 },
  saveError: { fontSize: 13 },

  
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },

  
  pickerCard: { alignSelf: 'center', marginBottom: 80, width: 300, borderRadius: 20, padding: 20, gap: 16, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 20, elevation: 10 },
  pickerYearRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pickerArrowBtn: { padding: 8 },
  pickerArrow: { fontSize: 24, lineHeight: 28 },
  pickerYear: { fontSize: 20, fontWeight: '800' },
  pickerMonthGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pickerMonthCell: { width: '30%', paddingVertical: 10, alignItems: 'center', borderRadius: 10, flexGrow: 1 },
  pickerMonthText: { fontSize: 14, fontWeight: '500' },

  
  modalCard: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 14 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalTitleType: { fontSize: 16, fontWeight: '400' },
  fieldLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, borderWidth: 1 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  modalBtn: { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  cancelText: { fontWeight: '600', fontSize: 15 },
  saveText: { fontWeight: '700', fontSize: 15 },
  deleteBtn: { borderRadius: 12, borderWidth: 1, paddingVertical: 14, alignItems: 'center' },
  deleteText: { fontWeight: '700', fontSize: 15 },
});
