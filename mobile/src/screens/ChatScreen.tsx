import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { api, AssistantChatTurn } from '../api/client';
import { useColors } from '../theme/ThemeContext';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  contextUsed?: string[];
}

export function ChatScreen() {
  const c = useColors();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    if (messages.length > 0)
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 80);
  }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setSending(true);
    setError(null);
    const history: AssistantChatTurn[] = messages.map(m => ({ role: m.role, content: m.content }));
    try {
      const res = await api.chat(text, history);
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

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: c.background }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={88}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: c.background, borderBottomColor: c.outline }]}>
        <View style={[styles.stellaAvatar, { backgroundColor: c.primaryMuted }]}>
          <Text style={[styles.stellaLetter, { color: c.primary }]}>S</Text>
        </View>
        <View>
          <Text style={[styles.stellaName, { color: c.onSurface }]}>Stella</Text>
          <Text style={[styles.stellaStatus, { color: c.secondary }]}>● En línea</Text>
        </View>
      </View>

      {/* Messages */}
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

      {/* Input row */}
      <View style={[styles.inputRow, { backgroundColor: c.surface, borderTopColor: c.outline }]}>
        <TextInput
          style={[styles.input, { backgroundColor: c.surfaceVariant, color: c.onSurface, borderColor: c.outline }]}
          placeholder="Escribe un mensaje…"
          placeholderTextColor={c.onSurfaceMuted}
          value={input}
          onChangeText={setInput}
          onSubmitEditing={send}
          returnKeyType="send"
          editable={!sending}
          multiline
        />
        <TouchableOpacity
          style={[styles.sendBtn, { backgroundColor: input.trim() && !sending ? c.primary : c.surfaceVariant }]}
          onPress={send}
          disabled={!input.trim() || sending}
        >
          {sending
            ? <ActivityIndicator size="small" color={c.primary} />
            : <Text style={[styles.sendIcon, { color: input.trim() ? c.onPrimary : c.onSurfaceMuted }]}>↑</Text>}
        </TouchableOpacity>
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
        isUser
          ? { backgroundColor: c.primary }
          : { backgroundColor: c.surface },
      ]}>
        <Text style={[styles.bubbleText, { color: isUser ? c.onPrimary : c.onSurface }]}>
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
          Stella escribiendo…
        </Text>
      </View>
    </View>
  );
}

function EmptyState({ c }: { c: ReturnType<typeof useColors> }) {
  return (
    <View style={styles.empty}>
      <View style={[styles.emptyAvatar, { backgroundColor: c.primaryMuted }]}>
        <Text style={[styles.emptyAvatarText, { color: c.primary }]}>S</Text>
      </View>
      <Text style={[styles.emptyTitle, { color: c.onSurface }]}>Hola, soy Stella</Text>
      <Text style={[styles.emptyBody, { color: c.onSurfaceMuted }]}>
        Puedo ayudarte a crear tareas, eventos y reuniones, o responder preguntas sobre tu agenda.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  stellaAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  stellaLetter: { fontSize: 18, fontWeight: '700' },
  stellaName: { fontSize: 15, fontWeight: '700' },
  stellaStatus: { fontSize: 12 },
  list: { padding: 16, gap: 10 },
  bubbleWrap: { alignItems: 'flex-start', maxWidth: '82%' },
  bubbleWrapUser: { alignSelf: 'flex-end', alignItems: 'flex-end' },
  bubble: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleText: { fontSize: 14, lineHeight: 21 },
  context: { fontSize: 10, marginTop: 3, marginHorizontal: 4 },
  error: { fontSize: 13, marginHorizontal: 16, marginBottom: 4 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, padding: 12, borderTopWidth: 1 },
  input: { flex: 1, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, fontSize: 14, maxHeight: 110, borderWidth: 1 },
  sendBtn: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  sendIcon: { fontSize: 18, fontWeight: '700' },
  empty: { alignItems: 'center', paddingTop: 60, paddingHorizontal: 32, gap: 14 },
  emptyAvatar: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center' },
  emptyAvatarText: { fontSize: 32, fontWeight: '700' },
  emptyTitle: { fontSize: 20, fontWeight: '700' },
  emptyBody: { fontSize: 14, lineHeight: 22, textAlign: 'center' },
});
