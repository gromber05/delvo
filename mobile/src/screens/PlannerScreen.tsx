import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import {
  IconPencil,
  IconTrash,
  IconPlus,
  IconCalendar,
  IconCheck,
  IconFolder,
  IconList,
  IconSortAscending,
} from '@tabler/icons-react-native';
import { api, EventDto, MeetingDto, NoteDto, TaskDto } from '../api/client';
import { useColors } from '../theme/ThemeContext';

type TaskFilter = 'all' | 'pending' | 'done';
type EditTarget =
  | { type: 'task'; item: TaskDto }
  | { type: 'meeting'; item: MeetingDto }
  | { type: 'event'; item: EventDto }
  | { type: 'note'; item: NoteDto };
const TASK_FILTER_LABELS: Record<TaskFilter, string> = { all: 'Todo', pending: 'Pendientes', done: 'Completadas' };

const PRIORITY_COLORS: Record<string, string> = {
  high: '#EF4444',
  medium: '#F59E0B',
  low: '#22C55E',
};

const WEEKDAYS = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];

function toISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function buildGrid(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const dow = first.getDay();
  const shift = dow === 0 ? 6 : dow - 1;
  const start = new Date(year, month, 1 - shift);
  return Array.from({ length: 42 }, (_, i) =>
    new Date(start.getFullYear(), start.getMonth(), start.getDate() + i));
}

function chunk<T>(arr: T[], n: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
}

function formatDate(dateStr: string): string {
  const today = new Date().toISOString().split('T')[0];
  const tomorrow = new Date(Date.now() + 86_400_000).toISOString().split('T')[0];
  if (dateStr === today) return 'Hoy';
  if (dateStr === tomorrow) return 'Mañana';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('es-ES', { month: 'short', day: 'numeric' });
}

export function PlannerScreen() {
  const c = useColors();
  const navigation = useNavigation();
  const [taskFilter, setTaskFilter] = useState<TaskFilter>('all');
  const [sortTasksByDueDate, setSortTasksByDueDate] = useState(false);
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [editContent, setEditContent] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [completingTaskId, setCompletingTaskId] = useState<number | null>(null);

  const [tasks, setTasks] = useState<TaskDto[]>([]);
  const [meetings, setMeetings] = useState<MeetingDto[]>([]);
  const [events, setEvents] = useState<EventDto[]>([]);
  const [notes, setNotes] = useState<NoteDto[]>([]);
  const [loading, setLoading] = useState(true);

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState(toISO(now));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [tk, mt, ev, nt] = await Promise.all([
        api.listTasks(),
        api.listMeetings(),
        api.listEvents(),
        api.listNotes(),
      ]);
      setTasks(tk.items);
      setMeetings(mt.items);
      setEvents(ev.items);
      setNotes((nt as { items: NoteDto[] }).items);
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const pendingTasks = tasks.filter(t => t.status !== 'done');
  const doneTasks = tasks.filter(t => t.status === 'done');
  const allTasks = useMemo(() => {
    const filtered = taskFilter === 'pending'
      ? pendingTasks
      : taskFilter === 'done'
        ? doneTasks
        : [...pendingTasks, ...doneTasks];

    if (!sortTasksByDueDate) return filtered;

    return [...filtered].sort((a, b) => {
      const aDate = a.due_date ? `${a.due_date}T${a.due_time ?? '23:59:59'}` : '9999-12-31T23:59:59';
      const bDate = b.due_date ? `${b.due_date}T${b.due_time ?? '23:59:59'}` : '9999-12-31T23:59:59';
      return aDate.localeCompare(bDate);
    });
  }, [doneTasks, pendingTasks, sortTasksByDueDate, taskFilter]);

  const calendarGrid = useMemo(() => buildGrid(year, month), [year, month]);
  const today = toISO(now);

  const itemsByDate = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of events) map[e.event_date] = (map[e.event_date] ?? 0) + 1;
    for (const m of meetings) map[m.meeting_date] = (map[m.meeting_date] ?? 0) + 1;
    for (const t of tasks) {
      if (t.due_date) map[t.due_date] = (map[t.due_date] ?? 0) + 1;
    }
    return map;
  }, [events, meetings, tasks]);

  const selectedDayEvents = useMemo(
    () => events.filter(e => e.event_date === selectedDate),
    [events, selectedDate],
  );
  const selectedDayMeetings = useMemo(
    () => meetings.filter(m => m.meeting_date === selectedDate),
    [meetings, selectedDate],
  );
  const selectedDayTasks = useMemo(
    () => tasks.filter(t => t.due_date === selectedDate),
    [tasks, selectedDate],
  );

  function shiftMonth(dir: number) {
    const d = new Date(year, month + dir, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  }

  const monthLabel = new Date(year, month, 1).toLocaleString('es-ES', {
    month: 'long',
    year: 'numeric',
  });

  const selectedDayLabel = selectedDate === today
    ? `Hoy, ${new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', month: 'short', day: 'numeric' })}`
    : new Date(selectedDate + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', month: 'short', day: 'numeric' });

  async function deleteTask(id: number) {
    Alert.alert('Eliminar tarea', '¿Seguro que quieres eliminarla?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive', onPress: async () => {
          try { await api.deleteTask(id); load(); } catch { /* ignore */ }
        },
      },
    ]);
  }

  async function deleteEvent(id: number) {
    Alert.alert('Eliminar evento', '¿Seguro que quieres eliminarlo?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive', onPress: async () => {
          try { await api.deleteEvent(id); load(); } catch { /* ignore */ }
        },
      },
    ]);
  }

  async function deleteMeeting(id: number) {
    Alert.alert('Eliminar reunión', '¿Seguro que quieres eliminarla?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive', onPress: async () => {
          try { await api.deleteMeeting(id); load(); } catch { /* ignore */ }
        },
      },
    ]);
  }

  async function completeTask(task: TaskDto) {
    if (task.status === 'done' || completingTaskId) return;
    setCompletingTaskId(task.id);
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
    } catch {
      await load();
    } finally {
      setCompletingTaskId(null);
    }
  }

  function openEdit(target: EditTarget) {
    setEditTarget(target);
    setEditTitle(target.item.title);
    setEditError(null);

    if (target.type === 'task') {
      setEditDate(target.item.due_date ?? '');
      setEditTime(target.item.due_time ?? '');
      setEditContent(target.item.description ?? '');
    } else if (target.type === 'meeting') {
      setEditDate(target.item.meeting_date);
      setEditTime(target.item.meeting_time);
      setEditContent(target.item.description ?? '');
    } else if (target.type === 'event') {
      setEditDate(target.item.event_date);
      setEditTime(target.item.event_time ?? '');
      setEditContent(target.item.description ?? '');
    } else {
      setEditDate('');
      setEditTime('');
      setEditContent(target.item.content ?? '');
    }
  }

  function closeEdit() {
    if (savingEdit) return;
    setEditTarget(null);
    setEditError(null);
  }

  async function saveEdit() {
    if (!editTarget || !editTitle.trim()) return;
    setSavingEdit(true);
    setEditError(null);

    try {
      if (editTarget.type === 'task') {
        await api.updateTask(editTarget.item.id, {
          title: editTitle.trim(),
          description: editContent.trim() || null,
          due_date: editDate.trim() || null,
          due_time: editTime.trim() || null,
          priority: editTarget.item.priority,
          status: editTarget.item.status,
        });
      } else if (editTarget.type === 'meeting') {
        if (!editDate.trim()) throw new Error('La fecha es obligatoria.');
        await api.updateMeeting(editTarget.item.id, {
          title: editTitle.trim(),
          meeting_date: editDate.trim(),
          meeting_time: editTime.trim() || '09:00:00',
        });
      } else if (editTarget.type === 'event') {
        if (!editDate.trim()) throw new Error('La fecha es obligatoria.');
        await api.updateEvent(editTarget.item.id, {
          title: editTitle.trim(),
          event_date: editDate.trim(),
          event_time: editTime.trim() || undefined,
        });
      } else {
        await api.updateNote(editTarget.item.id, {
          title: editTitle.trim(),
          content: editContent.trim() || null,
          status: editTarget.item.status,
        });
      }

      setEditTarget(null);
      await load();
    } catch (e: unknown) {
      setEditError(e instanceof Error ? e.message : 'No se pudo guardar.');
    } finally {
      setSavingEdit(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: c.background }}>
      {loading ? (
        <ActivityIndicator color={c.primary} style={{ marginTop: 0 }} />
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.content}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={c.primary} />}
        >
          <Text style={[styles.calMonthTitle, { color: c.onSurface }]}>Calendario</Text>
          {(
            <>
              <View style={styles.syncRow}>
                <View style={[styles.syncDot, { backgroundColor: c.secondary }]} />
                <Text style={[styles.syncText, { color: c.onSurfaceMuted }]}>
                  Sincronizado con Google Calendar
                </Text>
              </View>

              <View style={styles.calHeaderRow}>
                <Text style={[styles.calMonthTitle, { color: c.onSurface }]}>{monthLabel}</Text>
                <View style={styles.calNavBtns}>
                  <TouchableOpacity onPress={() => shiftMonth(-1)} style={[styles.calNavBtn, { backgroundColor: c.surface }]}>
                    <Text style={[styles.calNavArrow, { color: c.onSurface }]}>‹</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => shiftMonth(1)} style={[styles.calNavBtn, { backgroundColor: c.surface }]}>
                    <Text style={[styles.calNavArrow, { color: c.onSurface }]}>›</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.newEventBtn, { backgroundColor: c.primary }]}
                onPress={() => navigation.navigate('Create' as never)}
              >
                <IconPlus size={18} color="#fff" />
                <Text style={styles.newEventBtnText}>Nuevo evento</Text>
              </TouchableOpacity>

              <View style={[styles.calGrid, { backgroundColor: c.surface }]}>
                <View style={styles.weekRow}>
                  {WEEKDAYS.map(d => (
                    <Text key={d} style={[styles.weekDay, { color: c.onSurfaceMuted }]}>{d}</Text>
                  ))}
                </View>
                {chunk(calendarGrid, 7).map((week, wi) => (
                  <View key={wi} style={styles.weekRow}>
                    {week.map(day => {
                      const iso = toISO(day);
                      const inMonth = day.getMonth() === month;
                      const isSel = iso === selectedDate;
                      const isToday = iso === today;
                      const count = itemsByDate[iso] ?? 0;
                      return (
                        <Pressable
                          key={iso}
                          style={[
                            styles.dayCell,
                            isToday && { backgroundColor: c.primary },
                            isSel && !isToday && { backgroundColor: c.primaryMuted },
                          ]}
                          onPress={() => setSelectedDate(iso)}
                        >
                          <Text style={[
                            styles.dayNum,
                            { color: isToday ? '#fff' : inMonth ? c.onSurface : c.onSurfaceMuted },
                            isToday && { fontWeight: '800' },
                          ]}>
                            {day.getDate()}
                          </Text>
                          {count > 0 && (
                            <View style={styles.dotsRow}>
                              {Array.from({ length: Math.min(count, 3) }).map((_, i) => (
                                <View key={i} style={[styles.dot, {
                                  backgroundColor: i === 0 ? c.primary : i === 1 ? c.medium : c.secondary,
                                }]} />
                              ))}
                            </View>
                          )}
                        </Pressable>
                      );
                    })}
                  </View>
                ))}
              </View>

              <Text style={[styles.dayHeader, { color: c.onSurface }]}>{selectedDayLabel}</Text>

              {selectedDayEvents.length === 0 && selectedDayMeetings.length === 0 && selectedDayTasks.length === 0 ? (
                <EmptyCard label="No hay elementos este día" c={c} />
              ) : (
                <>
                  {selectedDayTasks.map(task => {
                    const pColor = PRIORITY_COLORS[task.priority] ?? c.primary;
                    return (
                      <View key={`task-${task.id}`} style={[styles.eventCard, { backgroundColor: c.surface }]}>
                        <View style={styles.eventTimeCol}>
                          <Text style={[styles.eventTime, { color: c.onSurface }]}>
                            {task.due_time ? task.due_time.slice(0, 5) : 'Tarea'}
                          </Text>
                        </View>
                        <View style={[styles.eventAccentLine, { backgroundColor: pColor }]} />
                        <View style={styles.eventBody}>
                          <Text style={[styles.eventTitle, { color: c.onSurface }]}>{task.title}</Text>
                          <Text style={[styles.eventLocation, { color: c.onSurfaceMuted }]}>
                            {task.status === 'done' ? 'Completada' : 'Pendiente'}
                          </Text>
                        </View>
                        {task.status !== 'done' && (
                          <TouchableOpacity
                            hitSlop={8}
                            onPress={() => completeTask(task)}
                            disabled={completingTaskId === task.id}
                            style={[styles.completeBtn, { borderColor: c.secondary, opacity: completingTaskId === task.id ? 0.5 : 1 }]}
                          >
                            <IconCheck size={14} color={c.secondary} />
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity hitSlop={8} onPress={() => openEdit({ type: 'task', item: task })}>
                          <IconPencil size={16} color={c.onSurfaceMuted} />
                        </TouchableOpacity>
                        <TouchableOpacity hitSlop={8} onPress={() => deleteTask(task.id)}>
                          <IconTrash size={16} color={c.onSurfaceMuted} />
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                  {selectedDayMeetings.map(mt => (
                    <View key={`meeting-${mt.id}`} style={[styles.eventCard, { backgroundColor: c.surface }]}>
                      <View style={styles.eventTimeCol}>
                        <Text style={[styles.eventTime, { color: c.onSurface }]}>{mt.meeting_time.slice(0, 5)}</Text>
                      </View>
                      <View style={[styles.eventAccentLine, { backgroundColor: c.primary }]} />
                      <View style={styles.eventBody}>
                        <Text style={[styles.eventTitle, { color: c.onSurface }]}>{mt.title}</Text>
                        <Text style={[styles.eventLocation, { color: c.onSurfaceMuted }]}>Reunión</Text>
                      </View>
                      <TouchableOpacity hitSlop={8} onPress={() => openEdit({ type: 'meeting', item: mt })}>
                        <IconPencil size={16} color={c.onSurfaceMuted} />
                      </TouchableOpacity>
                      <TouchableOpacity hitSlop={8} onPress={() => deleteMeeting(mt.id)}>
                        <IconTrash size={16} color={c.onSurfaceMuted} />
                      </TouchableOpacity>
                    </View>
                  ))}
                  {selectedDayEvents.map(ev => (
                    <View key={`event-${ev.id}`} style={[styles.eventCard, { backgroundColor: c.surface }]}>
                      <View style={styles.eventTimeCol}>
                        {ev.event_time ? (
                          <Text style={[styles.eventTime, { color: c.onSurface }]}>
                            {ev.event_time.slice(0, 5)}
                          </Text>
                        ) : null}
                      </View>
                      <View style={[styles.eventAccentLine, { backgroundColor: c.medium }]} />
                      <View style={styles.eventBody}>
                        <Text style={[styles.eventTitle, { color: c.onSurface }]}>{ev.title}</Text>
                        <Text style={[styles.eventLocation, { color: c.onSurfaceMuted }]}>
                          {ev.location ?? 'Evento'}
                        </Text>
                      </View>
                      <TouchableOpacity hitSlop={8} onPress={() => openEdit({ type: 'event', item: ev })}>
                        <IconPencil size={16} color={c.onSurfaceMuted} />
                      </TouchableOpacity>
                      <TouchableOpacity hitSlop={8} onPress={() => deleteEvent(ev.id)}>
                        <IconTrash size={16} color={c.onSurfaceMuted} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </>
              )}
            </>
          )}

          <View style={{ height: 80 }} />
        </ScrollView>
      )}

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: c.primary }]}
        onPress={() => navigation.navigate('Create' as never)}
        activeOpacity={0.85}
      >
        <IconPlus size={26} color="#fff" />
      </TouchableOpacity>

      <Modal visible={editTarget !== null} transparent animationType="slide" onRequestClose={closeEdit}>
        <View style={styles.overlay}>
          <View style={[styles.modalCard, { backgroundColor: c.surface }]}>
            <Text style={[styles.modalTitle, { color: c.onSurface }]}>
              Editar {editTarget ? (
                editTarget.type === 'task' ? 'tarea' :
                editTarget.type === 'meeting' ? 'reunión' :
                editTarget.type === 'event' ? 'evento' : 'nota'
              ) : ''}
            </Text>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: c.onSurfaceMuted }]}>Título</Text>
              <TextInput
                style={[styles.input, { backgroundColor: c.surfaceVariant, color: c.onSurface, borderColor: c.outline }]}
                value={editTitle}
                onChangeText={setEditTitle}
                placeholderTextColor={c.onSurfaceMuted}
                editable={!savingEdit}
              />
            </View>

            {editTarget?.type !== 'note' && (
              <>
                <View style={styles.fieldGroup}>
                  <Text style={[styles.fieldLabel, { color: c.onSurfaceMuted }]}>
                    {editTarget?.type === 'task' ? 'Fecha límite (yyyy-MM-dd)' : 'Fecha (yyyy-MM-dd)'}
                  </Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: c.surfaceVariant, color: c.onSurface, borderColor: c.outline }]}
                    value={editDate}
                    onChangeText={setEditDate}
                    placeholder="2026-05-20"
                    placeholderTextColor={c.onSurfaceMuted}
                    editable={!savingEdit}
                  />
                </View>

                <View style={styles.fieldGroup}>
                  <Text style={[styles.fieldLabel, { color: c.onSurfaceMuted }]}>Hora (HH:mm:ss)</Text>
                  <TextInput
                    style={[styles.input, { backgroundColor: c.surfaceVariant, color: c.onSurface, borderColor: c.outline }]}
                    value={editTime}
                    onChangeText={setEditTime}
                    placeholder="09:00:00"
                    placeholderTextColor={c.onSurfaceMuted}
                    editable={!savingEdit}
                  />
                </View>
              </>
            )}

            {(editTarget?.type === 'task' || editTarget?.type === 'note') && (
              <View style={styles.fieldGroup}>
                <Text style={[styles.fieldLabel, { color: c.onSurfaceMuted }]}>
                  {editTarget?.type === 'task' ? 'Descripción' : 'Contenido'}
                </Text>
                <TextInput
                  style={[styles.input, styles.multilineInput, { backgroundColor: c.surfaceVariant, color: c.onSurface, borderColor: c.outline }]}
                  value={editContent}
                  onChangeText={setEditContent}
                  placeholderTextColor={c.onSurfaceMuted}
                  editable={!savingEdit}
                  multiline
                />
              </View>
            )}

            {editError ? <Text style={[styles.editError, { color: c.error }]}>{editError}</Text> : null}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalBtn, { borderColor: c.outline, borderWidth: 1 }]}
                onPress={closeEdit}
                disabled={savingEdit}
              >
                <Text style={[styles.cancelText, { color: c.onSurface }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: c.primary }, savingEdit && { opacity: 0.6 }]}
                onPress={saveEdit}
                disabled={savingEdit}
              >
                {savingEdit
                  ? <ActivityIndicator color={c.onPrimary} />
                  : <Text style={[styles.saveText, { color: c.onPrimary }]}>Guardar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function EmptyCard({ label, c }: { label: string; c: ReturnType<typeof useColors> }) {
  return (
    <View style={[styles.emptyCard, { backgroundColor: c.surface }]}>
      <Text style={[styles.emptyText, { color: c.onSurfaceMuted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 56, gap: 16 },
  sectionTitle: { fontSize: 18, fontWeight: '800', marginTop: 20 },

  filterRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  filterScroll: { flex: 1, minWidth: 0 },
  filterScrollContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipText: { fontSize: 13, fontWeight: '600' },
  countText: { width: 72, textAlign: 'right', fontSize: 12 },
  taskCard: { borderRadius: 16, flexDirection: 'row', overflow: 'hidden' },
  taskAccent: { width: 4 },
  taskBody: { flex: 1, padding: 14, gap: 6 },
  taskTopRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  taskTitle: { flex: 1, fontSize: 15, fontWeight: '600', lineHeight: 20 },
  strikethrough: { textDecorationLine: 'line-through', opacity: 0.6 },
  priorityBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, flexShrink: 0 },
  priorityBadgeText: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  taskMeta: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12 },
  taskActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  iconBtn: { padding: 4 },
  listCard: { borderRadius: 16, flexDirection: 'row', alignItems: 'center', overflow: 'hidden' },
  listAccent: { width: 4, alignSelf: 'stretch' },
  listBody: { flex: 1, padding: 14, gap: 4 },
  listTitle: { fontSize: 15, fontWeight: '600' },
  listActions: { flexDirection: 'row', gap: 8, paddingRight: 12 },
  syncRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 1 },
  syncDot: { width: 8, height: 8, borderRadius: 4 },
  syncText: { fontSize: 13 },
  calHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  calMonthTitle: { fontSize: 28, fontWeight: '800', letterSpacing: 0, margin: 0, padding: 0 },
  calNavBtns: { flexDirection: 'row', gap: 8 },
  calNavBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  calNavArrow: { fontSize: 20, lineHeight: 24 },
  newEventBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 12,
  },
  newEventBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  calGrid: { borderRadius: 16, padding: 12, gap: 4, marginBottom: 16 },
  weekRow: { flexDirection: 'row' },
  weekDay: { flex: 1, textAlign: 'center', fontSize: 10, fontWeight: '700', paddingVertical: 6, letterSpacing: 0.5 },
  dayCell: { flex: 1, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 10, margin: 1 },
  dayNum: { fontSize: 13 },
  dotsRow: { flexDirection: 'row', gap: 2, marginTop: 1 },
  dot: { width: 4, height: 4, borderRadius: 2 },
  dayHeader: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
  },
  eventTimeCol: { width: 48, alignItems: 'flex-end' },
  eventTime: { fontSize: 13, fontWeight: '600' },
  eventAccentLine: { width: 3, height: '100%', borderRadius: 2, alignSelf: 'stretch' },
  eventBody: { flex: 1 },
  eventTitle: { fontSize: 15, fontWeight: '600' },
  eventLocation: { fontSize: 12, marginTop: 2 },
  completeBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyCard: { borderRadius: 16, paddingHorizontal: 16, paddingVertical: 18 },
  emptyText: { fontSize: 14 },

  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
    padding: 16,
  },
  modalCard: {
    borderRadius: 18,
    padding: 18,
    gap: 12,
  },
  modalTitle: { fontSize: 20, fontWeight: '800' },
  fieldGroup: { gap: 6 },
  fieldLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
  input: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 11, fontSize: 14 },
  multilineInput: { minHeight: 96, textAlignVertical: 'top' },
  editError: { fontSize: 13 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  modalBtn: { flex: 1, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  cancelText: { fontSize: 14, fontWeight: '700' },
  saveText: { fontSize: 14, fontWeight: '700' },
});
