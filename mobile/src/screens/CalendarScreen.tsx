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
import { useFocusEffect } from '@react-navigation/native';
import { api, EventDto, MeetingDto } from '../api/client';
import { useColors } from '../theme/ThemeContext';

const WEEKDAYS = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const MONTH_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

interface CalendarEntry {
  id: string;
  type: 'event' | 'meeting';
  rawId: number;
  title: string;
  date: string;
  time: string;
}

function toISO(d: Date) { return d.toISOString().split('T')[0]; }

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

export function CalendarScreen() {
  const c = useColors();
  const now = new Date();

  const [events, setEvents] = useState<EventDto[]>([]);
  const [meetings, setMeetings] = useState<MeetingDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selected, setSelected] = useState(toISO(now));

  // Month/year picker
  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerYear, setPickerYear] = useState(now.getFullYear());

  // Edit modal
  const [editTarget, setEditTarget] = useState<CalendarEntry | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [ev, mt] = await Promise.all([api.listEvents(), api.listMeetings()]);
      setEvents(ev.items); setMeetings(mt.items);
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Error al cargar.'); }
    finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const entries: CalendarEntry[] = useMemo(() => [
    ...events.map(e => ({ id: `ev-${e.id}`, type: 'event' as const, rawId: e.id, title: e.title, date: e.event_date, time: e.event_time ?? '' })),
    ...meetings.map(m => ({ id: `mt-${m.id}`, type: 'meeting' as const, rawId: m.id, title: m.title, date: m.meeting_date, time: m.meeting_time })),
  ], [events, meetings]);

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
    setEditTarget(e); setEditTitle(e.title); setEditDate(e.date); setEditTime(e.time);
  }

  async function saveEdit() {
    if (!editTarget || !editTitle.trim() || !editDate.trim()) return;
    setSaving(true);
    try {
      if (editTarget.type === 'event')
        await api.updateEvent(editTarget.rawId, { title: editTitle.trim(), event_date: editDate.trim(), event_time: editTime.trim() || undefined });
      else
        await api.updateMeeting(editTarget.rawId, { title: editTitle.trim(), meeting_date: editDate.trim(), meeting_time: editTime.trim() || '09:00:00' });
      setEditTarget(null); load();
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Error al guardar.'); }
    finally { setSaving(false); }
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.background }}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} tintColor={c.primary} />}
    >
      {/* ── Month nav ─────────────────────────────── */}
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
      </View>

      {/* ── Calendar grid ─────────────────────────── */}
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

      {/* ── Selected day ──────────────────────────── */}
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
            <View style={[styles.entryAccent, { backgroundColor: entry.type === 'event' ? c.medium : c.primary }]} />
            <View style={styles.entryBody}>
              <View style={styles.entryTopRow}>
                <Text style={[styles.entryType, { color: entry.type === 'event' ? c.medium : c.primary }]}>
                  {entry.type === 'event' ? 'Evento' : 'Reunión'}
                </Text>
                <TouchableOpacity onPress={() => openEdit(entry)}>
                  <Text style={[styles.editLink, { color: c.onSurfaceMuted }]}>Editar</Text>
                </TouchableOpacity>
              </View>
              <Text style={[styles.entryTitle, { color: c.onSurface }]}>{entry.title}</Text>
              {entry.time ? <Text style={[styles.entryTime, { color: c.onSurfaceMuted }]}>{entry.time}</Text> : null}
            </View>
          </View>
        ))
      )}

      {/* ── Month/year picker modal ────────────────── */}
      <Modal visible={pickerVisible} transparent animationType="fade">
        <Pressable style={styles.overlay} onPress={() => setPickerVisible(false)}>
          <Pressable style={[styles.pickerCard, { backgroundColor: c.surface }]} onPress={() => {}}>
            {/* Year row */}
            <View style={styles.pickerYearRow}>
              <TouchableOpacity onPress={() => setPickerYear(y => y - 1)} style={styles.pickerArrowBtn}>
                <Text style={[styles.pickerArrow, { color: c.primary }]}>‹</Text>
              </TouchableOpacity>
              <Text style={[styles.pickerYear, { color: c.onSurface }]}>{pickerYear}</Text>
              <TouchableOpacity onPress={() => setPickerYear(y => y + 1)} style={styles.pickerArrowBtn}>
                <Text style={[styles.pickerArrow, { color: c.primary }]}>›</Text>
              </TouchableOpacity>
            </View>

            {/* Month grid 4×3 */}
            <View style={styles.pickerMonthGrid}>
              {MONTH_SHORT.map((label, mi) => {
                const isActive = mi === month && pickerYear === year;
                return (
                  <TouchableOpacity
                    key={label}
                    style={[
                      styles.pickerMonthCell,
                      isActive && { backgroundColor: c.primaryMuted },
                    ]}
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

      {/* ── Edit modal ────────────────────────────── */}
      <Modal visible={editTarget !== null} transparent animationType="slide">
        <View style={styles.overlay}>
          <View style={[styles.modalCard, { backgroundColor: c.surface }]}>
            <Text style={[styles.modalTitle, { color: c.onSurface }]}>Editar</Text>
            {([
              { label: 'Título', value: editTitle, set: setEditTitle },
              { label: 'Fecha (yyyy-MM-dd)', value: editDate, set: setEditDate },
              { label: 'Hora (HH:mm:ss)', value: editTime, set: setEditTime },
            ] as const).map(f => (
              <View key={f.label} style={{ gap: 5 }}>
                <Text style={[styles.fieldLabel, { color: c.onSurfaceMuted }]}>{f.label}</Text>
                <TextInput
                  style={[styles.input, { backgroundColor: c.surfaceVariant, color: c.onSurface, borderColor: c.outline }]}
                  value={f.value}
                  onChangeText={f.set}
                  placeholderTextColor={c.onSurfaceMuted}
                />
              </View>
            ))}
            <View style={styles.modalActions}>
              <TouchableOpacity style={[styles.modalBtn, { borderColor: c.outline, borderWidth: 1 }]} onPress={() => setEditTarget(null)} disabled={saving}>
                <Text style={[styles.cancelText, { color: c.onSurface }]}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, { backgroundColor: c.primary }, saving && { opacity: 0.6 }]} onPress={saveEdit} disabled={saving}>
                {saving ? <ActivityIndicator color={c.onPrimary} /> : <Text style={[styles.saveText, { color: c.onPrimary }]}>Guardar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <View style={{ height: 16 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12 },

  // Nav
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 14, paddingHorizontal: 8, paddingVertical: 4 },
  navBtn: { padding: 10 },
  navArrow: { fontSize: 26, lineHeight: 32 },
  monthLabelBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 6, paddingHorizontal: 10 },
  monthLabel: { fontSize: 15, fontWeight: '700', textTransform: 'capitalize' },
  dropChevron: { fontSize: 13, lineHeight: 18 },

  // Grid
  grid: { borderRadius: 16, padding: 12, gap: 6 },
  weekRow: { flexDirection: 'row' },
  weekDay: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '700', paddingVertical: 4 },
  dayCell: { flex: 1, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 10, margin: 1 },
  dayNum: { fontSize: 13 },
  dot: { width: 4, height: 4, borderRadius: 2, marginTop: 2 },

  // Entries
  sectionHeader: { fontSize: 11, fontWeight: '700', letterSpacing: 1.2 },
  emptyCard: { borderRadius: 12, padding: 16 },
  emptyText: { fontSize: 14 },
  entryCard: { flexDirection: 'row', borderRadius: 14, overflow: 'hidden' },
  entryAccent: { width: 4 },
  entryBody: { flex: 1, padding: 14, gap: 4 },
  entryTopRow: { flexDirection: 'row', justifyContent: 'space-between' },
  entryType: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  editLink: { fontSize: 12 },
  entryTitle: { fontSize: 15, fontWeight: '600' },
  entryTime: { fontSize: 12 },
  error: { fontSize: 13 },

  // Overlay (shared)
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', alignItems: 'center' },

  // Month/year picker
  pickerCard: { width: 300, borderRadius: 20, padding: 20, gap: 16, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 20, elevation: 10 },
  pickerYearRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pickerArrowBtn: { padding: 8 },
  pickerArrow: { fontSize: 24, lineHeight: 28 },
  pickerYear: { fontSize: 20, fontWeight: '800' },
  pickerMonthGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pickerMonthCell: { width: '30%', paddingVertical: 10, alignItems: 'center', borderRadius: 10, flexGrow: 1 },
  pickerMonthText: { fontSize: 14, fontWeight: '500' },

  // Edit modal
  modalCard: { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 14 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  fieldLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  input: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, borderWidth: 1 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  modalBtn: { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  cancelText: { fontWeight: '600', fontSize: 15 },
  saveText: { fontWeight: '700', fontSize: 15 },
});
