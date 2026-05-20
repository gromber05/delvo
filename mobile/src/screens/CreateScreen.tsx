import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { api } from '../api/client';
import { useColors } from '../theme/ThemeContext';
import { IconCalendarBolt, IconNote, IconPencil, IconProps, IconUsers } from '@tabler/icons-react-native';

type CreateType = 'task' | 'event' | 'meeting' | 'note';

const TYPES: { key: CreateType; label: string; icon: React.FC<IconProps> }[] = [
  { key: 'task', label: 'Tarea', icon: IconPencil },
  { key: 'event', label: 'Evento', icon: IconCalendarBolt },
  { key: 'meeting', label: 'Reunión', icon: IconUsers },
  { key: 'note', label: 'Nota', icon: IconNote },
];

export function CreateScreen() {
  const c = useColors();
  const [type, setType] = useState<CreateType>('task');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function resetForm() { setTitle(''); setDate(''); setTime(''); setContent(''); setError(null); setSuccess(false); }

  async function submit() {
    setError(null); setSuccess(false);
    if (!title.trim()) { setError('El título es obligatorio.'); return; }
    if ((type === 'event' || type === 'meeting') && !date.trim()) { setError('La fecha es obligatoria.'); return; }
    setLoading(true);
    try {
      if (type === 'task') await api.createTask({ title: title.trim(), due_date: date || undefined, due_time: time || undefined });
      else if (type === 'event') await api.createEvent({ title: title.trim(), event_date: date.trim(), event_time: time || undefined });
      else if (type === 'meeting') await api.createMeeting({ title: title.trim(), meeting_date: date.trim(), meeting_time: time || '09:00:00' });
      else await api.createNote({ title: title.trim(), content: content || undefined });
      setSuccess(true);
      setTitle(''); setDate(''); setTime(''); setContent('');
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'No se pudo crear.'); }
    finally { setLoading(false); }
  }

  const needsDate = type === 'event' || type === 'meeting';

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Type tabs */}
        <View style={[styles.typeBar, { backgroundColor: c.surface }]}>
          {TYPES.map(t => {
            const active = type === t.key;
            const IconComp = t.icon;
            return (
              <TouchableOpacity
                key={t.key}
                style={[styles.typeTab, active && { backgroundColor: c.primaryMuted }]}
                onPress={() => { setType(t.key); resetForm(); }}
              >
                <IconComp width={20} height={20} strokeWidth={1.5} color={active ? c.primary : c.onSurfaceMuted} />
                <Text style={[styles.typeLabel, { color: active ? c.primary : c.onSurfaceMuted, fontWeight: active ? '700' : '400' }]}>
                  {t.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Form */}
        <View style={[styles.form, { backgroundColor: c.surface }]}>
          <FormField label="Título" c={c}>
            <TextInput
              style={[styles.input, { backgroundColor: c.surfaceVariant, color: c.onSurface, borderColor: c.outline }]}
              placeholder={type === 'task' ? 'Ej: Revisar documentación' : type === 'note' ? 'Ej: Ideas para el proyecto' : 'Ej: Reunión de equipo'}
              placeholderTextColor={c.onSurfaceMuted}
              value={title}
              onChangeText={v => { setTitle(v); setError(null); setSuccess(false); }}
              editable={!loading}
            />
          </FormField>

          {needsDate && (
            <FormField label="Fecha *" c={c}>
              <TextInput
                style={[styles.input, { backgroundColor: c.surfaceVariant, color: c.onSurface, borderColor: c.outline }]}
                placeholder="2026-05-20"
                placeholderTextColor={c.onSurfaceMuted}
                value={date}
                onChangeText={v => { setDate(v); setError(null); }}
                editable={!loading}
              />
            </FormField>
          )}

          {(needsDate || type === 'task') && (
            <FormField label={`Hora${type === 'meeting' ? ' *' : ' (opcional)'}`} c={c}>
              <TextInput
                style={[styles.input, { backgroundColor: c.surfaceVariant, color: c.onSurface, borderColor: c.outline }]}
                placeholder="09:00:00"
                placeholderTextColor={c.onSurfaceMuted}
                value={time}
                onChangeText={v => { setTime(v); setError(null); }}
                editable={!loading}
              />
            </FormField>
          )}

          {type === 'note' && (
            <FormField label="Contenido" c={c}>
              <TextInput
                style={[styles.input, styles.multiline, { backgroundColor: c.surfaceVariant, color: c.onSurface, borderColor: c.outline }]}
                placeholder="Escribe aquí tu nota…"
                placeholderTextColor={c.onSurfaceMuted}
                value={content}
                onChangeText={setContent}
                multiline
                numberOfLines={4}
                editable={!loading}
              />
            </FormField>
          )}

          {error ? <Text style={[styles.error, { color: c.error }]}>{error}</Text> : null}
          {success ? (
            <View style={[styles.successBox, { backgroundColor: 'rgba(124,228,185,0.12)' }]}>
              <Text style={[styles.successText, { color: c.secondary }]}>¡Creado correctamente!</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={[styles.btn, { backgroundColor: c.primary }, loading && { opacity: 0.6 }]}
            onPress={submit}
            disabled={loading}
          >
            {loading
              ? <ActivityIndicator color={c.onPrimary} />
              : <Text style={[styles.btnText, { color: c.onPrimary }]}>Crear {TYPES.find(t => t.key === type)?.label}</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function FormField({ label, children, c }: { label: string; children: React.ReactNode; c: ReturnType<typeof useColors> }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={[styles.fieldLabel, { color: c.onSurfaceMuted }]}>{label.toUpperCase()}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 14 },
  typeBar: { flexDirection: 'row', borderRadius: 16, padding: 6, gap: 4 },
  typeTab: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 12, gap: 4 },
  typeIcon: { fontSize: 16 },
  typeLabel: { fontSize: 11 },
  form: { borderRadius: 18, padding: 20, gap: 14 },
  fieldLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8 },
  input: { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, borderWidth: 1 },
  multiline: { height: 110, textAlignVertical: 'top' },
  error: { fontSize: 13 },
  successBox: { borderRadius: 10, padding: 12 },
  successText: { fontSize: 14, fontWeight: '600' },
  btn: { borderRadius: 12, paddingVertical: 15, alignItems: 'center', marginTop: 2 },
  btnText: { fontSize: 15, fontWeight: '700' },
});
