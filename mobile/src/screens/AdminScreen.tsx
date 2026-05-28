import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  IconUsers,
  IconMessages,
  IconMessageCircle,
  IconAlertCircle,
} from '@tabler/icons-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, AdminStatsDto } from '../api/client';
import { useColors } from '../theme/ThemeContext';

const SENTIMENT_COLORS: Record<string, string> = {
  positive: '#22c55e',
  neutral: '#f59e0b',
  negative: '#ef4444',
};

const SENTIMENT_LABELS: Record<string, string> = {
  positive: 'Positivo',
  neutral: 'Neutro',
  negative: 'Negativo',
};

export function AdminScreen() {
  const c = useColors();
  const insets = useSafeAreaInsets();
  const [stats, setStats] = useState<AdminStatsDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      const data = await api.adminStats();
      setStats(data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al cargar estadísticas');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.center, { backgroundColor: c.background }]}>
        <View style={[styles.errorCard, { backgroundColor: c.surface }]}>
          <IconAlertCircle size={32} color={c.error} />
          <Text style={[styles.errorText, { color: c.error }]}>{error}</Text>
          <TouchableOpacity
            style={[styles.retryBtn, { backgroundColor: c.primaryMuted }]}
            onPress={() => load()}
          >
            <Text style={[styles.retryText, { color: c.primary }]}>Reintentar</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!stats) return null;

  const totalSentiment = stats.sentiment_distribution.reduce((acc, x) => acc + x.count, 0) || 1;
  const totalIntents  = stats.intent_distribution.reduce((acc, x) => acc + x.count, 0) || 1;

  const METRICS = [
    { label: 'Usuarios',       value: stats.total_users,         icon: <IconUsers size={20} color={c.primary} />,          accent: c.primary },
    { label: 'Conversaciones', value: stats.total_conversations, icon: <IconMessageCircle size={20} color={c.secondary} />, accent: c.secondary },
    { label: 'Mensajes',       value: stats.total_messages,      icon: <IconMessages size={20} color={c.medium} />,         accent: c.medium },
  ];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: c.background }}
      contentContainerStyle={[styles.content, { paddingTop: insets.top + 8 }]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => load(true)}
          tintColor={c.primary}
        />
      }
    >
      {/* ── Metric tiles ─────────────────────────────── */}
      <View style={styles.metricsGrid}>
        {METRICS.map((item) => (
          <View key={item.label} style={[styles.metricTile, { backgroundColor: c.surface }]}>
            <View style={styles.metricTopRow}>
              <Text style={[styles.metricLabel, { color: c.onSurfaceMuted }]}>{item.label}</Text>
              {item.icon}
            </View>
            <Text style={[styles.metricValue, { color: c.onSurface }]}>
              {String(item.value)}
            </Text>
            <View style={[styles.metricUnderline, { backgroundColor: item.accent }]} />
          </View>
        ))}
      </View>

      {/* ── Sentimiento ──────────────────────────────── */}
      {stats.sentiment_distribution.length > 0 && (
        <>
          <Text style={[styles.sectionHeader, { color: c.onSurface }]}>Sentimiento</Text>
          <View style={[styles.card, { backgroundColor: c.surface }]}>
            {stats.sentiment_distribution.map((item) => {
              const pct   = Math.round((item.count / totalSentiment) * 100);
              const color = SENTIMENT_COLORS[item.sentiment] ?? c.primary;
              const label = SENTIMENT_LABELS[item.sentiment] ?? item.sentiment;
              return (
                <View key={item.sentiment} style={styles.barRow}>
                  <Text style={[styles.barLabel, { color: c.onSurface }]}>{label}</Text>
                  <View style={[styles.barTrack, { backgroundColor: c.outline }]}>
                    <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: color }]} />
                  </View>
                  <Text style={[styles.barPct, { color: c.onSurfaceMuted }]}>{pct}%</Text>
                </View>
              );
            })}
          </View>
        </>
      )}

      {/* ── Intents ───────────────────────────────────── */}
      {stats.intent_distribution.length > 0 && (
        <>
          <Text style={[styles.sectionHeader, { color: c.onSurface }]}>Peticiones más frecuentes</Text>
          <View style={[styles.card, { backgroundColor: c.surface }]}>
            {stats.intent_distribution.slice(0, 7).map((item) => {
              const pct = Math.round((item.count / totalIntents) * 100);
              return (
                <View key={item.intent} style={styles.barRow}>
                  <Text style={[styles.barLabel, { color: c.onSurface }]} numberOfLines={1}>
                    {item.intent.replace(/_/g, ' ')}
                  </Text>
                  <View style={[styles.barTrack, { backgroundColor: c.outline }]}>
                    <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: c.primary }]} />
                  </View>
                  <Text style={[styles.barPct, { color: c.onSurfaceMuted }]}>{item.count}</Text>
                </View>
              );
            })}
          </View>
        </>
      )}

      {/* ── Actividad ─────────────────────────────────── */}
      {stats.daily_activity.length > 0 && (
        <>
          <Text style={[styles.sectionHeader, { color: c.onSurface }]}>Actividad últimos 14 días</Text>
          <View style={[styles.card, { backgroundColor: c.surface }]}>
            <View style={styles.activityGrid}>
              {stats.daily_activity.map((d) => {
                const max = Math.max(...stats.daily_activity.map((x) => x.messages), 1);
                const barH = Math.max((d.messages / max) * 56, 4);
                return (
                  <View key={d.day} style={styles.activityCol}>
                    <Text style={[styles.activityCount, { color: c.onSurfaceMuted }]}>
                      {d.messages}
                    </Text>
                    <View style={[styles.activityBar, { height: barH, backgroundColor: c.primary }]} />
                    <Text style={[styles.activityDay, { color: c.onSurfaceMuted }]}>
                      {d.day.slice(5)}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        </>
      )}

      {/* ── Top usuarios ──────────────────────────────── */}
      {stats.top_users.length > 0 && (
        <>
          <Text style={[styles.sectionHeader, { color: c.onSurface }]}>Usuarios más activos</Text>
          <View style={[styles.card, { backgroundColor: c.surface }]}>
            {stats.top_users.slice(0, 5).map((u, i) => (
              <View
                key={u.email}
                style={[
                  styles.userRow,
                  i < Math.min(stats.top_users.length, 5) - 1 && { borderBottomWidth: 1, borderBottomColor: c.outline },
                ]}
              >
                <View style={[styles.userRank, { backgroundColor: c.primary }]}>
                  <Text style={styles.userRankText}>{i + 1}</Text>
                </View>
                <View style={styles.userInfo}>
                  <Text style={[styles.userName, { color: c.onSurface }]} numberOfLines={1}>
                    {u.name || u.email}
                  </Text>
                  <Text style={[styles.userEmail, { color: c.onSurfaceMuted }]} numberOfLines={1}>
                    {u.email}
                  </Text>
                </View>
                <Text style={[styles.userConvs, { color: c.primary }]}>{u.conversations} conv.</Text>
              </View>
            ))}
          </View>
        </>
      )}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 20, gap: 12 },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  errorCard: {
    borderRadius: 18,
    padding: 24,
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
  errorText: { fontSize: 14, textAlign: 'center' },
  retryBtn: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20 },
  retryText: { fontSize: 13, fontWeight: '700' },

  // ── Metrics ───────────────────
  metricsGrid: { flexDirection: 'row', gap: 10 },
  metricTile: {
    flex: 1,
    borderRadius: 18,
    padding: 14,
    gap: 4,
    overflow: 'hidden',
  },
  metricTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  metricLabel: { fontSize: 11, fontWeight: '600' },
  metricValue: { fontSize: 32, fontWeight: '800', lineHeight: 38 },
  metricUnderline: { height: 3, borderRadius: 2 },

  // ── Section header ────────────
  sectionHeader: { fontSize: 17, fontWeight: '700', marginTop: 4 },

  // ── Generic card ──────────────
  card: { borderRadius: 18, padding: 16, gap: 10 },

  // ── Bars ──────────────────────
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  barLabel: { width: 108, fontSize: 12 },
  barTrack: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4, minWidth: 4 },
  barPct: { width: 34, fontSize: 11, textAlign: 'right' },

  // ── Activity chart ────────────
  activityGrid: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 80 },
  activityCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 2 },
  activityCount: { fontSize: 9 },
  activityBar: { width: '100%', borderRadius: 3 },
  activityDay: { fontSize: 8 },

  // ── Top users ─────────────────
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    gap: 10,
  },
  userRank: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  userRankText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  userInfo: { flex: 1 },
  userName: { fontSize: 13, fontWeight: '600' },
  userEmail: { fontSize: 11, marginTop: 1 },
  userConvs: { fontSize: 12, fontWeight: '600' },
});
