import { Audio } from 'expo-av';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, AssistantChatTurn } from '../api/client';
import { useColors } from '../theme/ThemeContext';
import {
  IconCalendarPlus,
  IconClipboardCheck,
  IconClipboardText,
  IconDotsVertical,
  IconMicrophone,
  IconPlayerStop,
  IconRobot,
  IconSearch,
  IconSend,
} from '@tabler/icons-react-native';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  contextUsed?: string[];
}

type RecordState = 'idle' | 'recording' | 'transcribing';

const QUICK_ACTIONS = [
  { label: 'CREAR EVENTO', prompt: 'Crea un nuevo evento para mí' },
  { label: 'NUEVA TAREA', prompt: 'Ayúdame a crear una nueva tarea' },
  { label: 'RESUMEN', prompt: 'Resume mi agenda de hoy' },
];

export function ChatScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recordState, setRecordState] = useState<RecordState>('idle');
  const recordingRef = useRef<Audio.Recording | null>(null);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    if (messages.length > 0)
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
  }, [messages]);

  async function send(text?: string) {
    const content = (text ?? input).trim();
    if (!content || sending) return;
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setSending(true);
    setError(null);
    const history: AssistantChatTurn[] = messages.map(m => ({ role: m.role, content: m.content }));
    try {
      const res = await api.chat(content, history);
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: res.message,
        contextUsed: res.context_used,
      }]);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al enviar.');
    } finally {
      setSending(false);
    }
  }

  async function startRecording() {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );
      recordingRef.current = recording;
      setRecordState('recording');
      setError(null);
    } catch {
      setError('No se pudo acceder al micrófono.');
    }
  }

  async function stopRecording() {
    const recording = recordingRef.current;
    if (!recording) return;
    setRecordState('transcribing');
    try {
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      const uri = recording.getURI();
      recordingRef.current = null;
      if (!uri) throw new Error('No se pudo obtener el audio.');
      const text = await api.transcribeAudio(uri);
      if (text) await send(text);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error de transcripción.');
    } finally {
      setRecordState('idle');
    }
  }

  const showMic = !input.trim() && !sending;
  const isRecording = recordState === 'recording';
  const isTranscribing = recordState === 'transcribing';

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: c.background }}
      behavior="padding"
      keyboardVerticalOffset={0}
    >
      <View style={[styles.header, { backgroundColor: c.background, borderBottomColor: c.outline, paddingTop: insets.top + 12 }]}>
        <View style={[styles.stellaAvatar, { backgroundColor: c.surface }]}>
          <IconRobot size={24} color={c.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.stellaName, { color: c.onSurface }]}>Stella IA</Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: c.secondary }]} />
            <Text style={[styles.statusText, { color: c.secondary }]}>En línea</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.headerIcon} hitSlop={8}>
          <IconSearch size={22} color={c.onSurfaceMuted} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.headerIcon} hitSlop={8}>
          <IconDotsVertical size={22} color={c.onSurfaceMuted} />
        </TouchableOpacity>
      </View>

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={m => m.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<EmptyState c={c} />}
        ListFooterComponent={sending ? <TypingBubble c={c} /> : null}
        renderItem={({ item }) => <Bubble msg={item} c={c} />}
      />

      {error ? <Text style={[styles.error, { color: c.error }]}>{error}</Text> : null}

      <View style={[styles.composerDock, { backgroundColor: c.surface, borderTopColor: c.outline }]}>
        {messages.length === 0 && !sending && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.quickActionsScroll}
            contentContainerStyle={styles.quickActionsRow}
          >
            {QUICK_ACTIONS.map(action => (
              <TouchableOpacity
                key={action.label}
                style={[styles.quickChip, { backgroundColor: c.surface, borderColor: c.outline }]}
                onPress={() => send(action.prompt)}
              >
                {action.label === 'CREAR EVENTO' && <IconCalendarPlus size={16} color={c.onSurface} />}
                {action.label === 'NUEVA TAREA' && <IconClipboardCheck size={16} color={c.onSurface} />}
                {action.label === 'RESUMEN' && <IconClipboardText size={16} color={c.onSurface} />}
                <Text style={[styles.quickChipText, { color: c.onSurface }]}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        <View style={styles.inputRow}>
          <TextInput
            style={[styles.input, { backgroundColor: c.surfaceVariant, color: c.onSurface, borderColor: c.outline }]}
            placeholder={
              isRecording ? '● Grabando…' :
              isTranscribing ? 'Transcribiendo…' :
              'Pregunta algo a Stella…'
            }
            placeholderTextColor={isRecording ? '#EF4444' : c.onSurfaceMuted}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={() => send()}
            returnKeyType="send"
            editable={!sending && !isRecording && !isTranscribing}
            multiline
          />

          {showMic ? (
            <TouchableOpacity
              style={[
                styles.sendBtn,
                { backgroundColor: isRecording ? '#EF4444' : isTranscribing ? c.surfaceVariant : c.primary },
              ]}
              onPress={isRecording ? stopRecording : startRecording}
              disabled={isTranscribing}
            >
              {isTranscribing
                ? <ActivityIndicator size="small" color={c.primary} />
                : isRecording
                  ? <IconPlayerStop width={20} height={20} strokeWidth={1.5} color="#fff" />
                  : <IconMicrophone width={20} height={20} strokeWidth={1.5} color="#fff" />
              }
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={[styles.sendBtn, { backgroundColor: input.trim() && !sending ? c.primary : c.surfaceVariant }]}
              onPress={() => send()}
              disabled={!input.trim() || sending}
            >
              {sending
                ? <ActivityIndicator size="small" color={c.primary} />
                : <IconSend width={20} height={20} strokeWidth={1.5} color={input.trim() ? '#fff' : c.onSurfaceMuted} />
              }
            </TouchableOpacity>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function Bubble({ msg, c }: { msg: Message; c: ReturnType<typeof useColors> }) {
  const isUser = msg.role === 'user';
  return (
    <View style={[styles.bubbleWrap, isUser && styles.bubbleWrapUser]}>
      <View style={[
        styles.bubble,
        isUser ? { backgroundColor: c.primary } : { backgroundColor: c.surface },
      ]}>
        <Text style={[styles.bubbleText, { color: isUser ? '#fff' : c.onSurface }]}>
          {msg.content}
        </Text>
      </View>
      {msg.contextUsed && msg.contextUsed.length > 0 && (
        <Text style={[styles.context, { color: c.onSurfaceMuted }]}>
          Contexto: {msg.contextUsed.join(', ')}
        </Text>
      )}
    </View>
  );
}

function TypingBubble({ c }: { c: ReturnType<typeof useColors> }) {
  return (
    <View style={styles.bubbleWrap}>
      <View style={[styles.bubble, { backgroundColor: c.surface }]}>
        <Text style={[styles.bubbleText, { color: c.onSurfaceMuted, fontStyle: 'italic' }]}>
          Stella está escribiendo…
        </Text>
      </View>
    </View>
  );
}

function EmptyState({ c }: { c: ReturnType<typeof useColors> }) {
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyAvatar, { backgroundColor: c.primaryMuted }]}>
        <IconRobot size={38} color={c.primary} />
      </View>
      <Text style={[styles.emptyTitle, { color: c.onSurface }]}>Hola, soy Stella</Text>
      <Text style={[styles.emptyBody, { color: c.onSurfaceMuted }]}>
        Puedo ayudarte a crear tareas, eventos y reuniones, o responder preguntas sobre tu agenda.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  stellaAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stellaAvatarIcon: { fontSize: 22 },
  stellaName: { fontSize: 16, fontWeight: '700' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 1 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 12, fontWeight: '500' },
  headerIcon: { padding: 4 },

  list: { padding: 16, gap: 10 },
  bubbleWrap: { alignItems: 'flex-start', maxWidth: '82%' },
  bubbleWrapUser: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  bubble: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleText: { fontSize: 14, lineHeight: 21 },
  context: { fontSize: 10, marginTop: 3, marginHorizontal: 4 },
  error: { fontSize: 13, marginHorizontal: 16, marginBottom: 4 },

  composerDock: {
    flexShrink: 0,
    borderTopWidth: 1,
  },
  quickActionsScroll: {
    flexShrink: 0,
  },
  quickActionsRow: {
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 4,
    gap: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  quickChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
  },
  quickChipIcon: { fontSize: 14 },
  quickChipText: { fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 12,
  },
  input: {
    flex: 1,
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 10,
    fontSize: 14,
    maxHeight: 110,
    borderWidth: 1,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },

  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32, gap: 14 },
  emptyAvatar: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  emptyAvatarIcon: { fontSize: 38 },
  emptyTitle: { fontSize: 22, fontWeight: '700' },
  emptyBody: { fontSize: 14, lineHeight: 22, textAlign: 'center' },
});
