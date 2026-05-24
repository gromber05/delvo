import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { api, AdminStatsDto } from '../api/client';
import { useTheme } from '../theme/ThemeContext';

const SENTIMENT_COLORS: Record<string, string> = {
  positive: '#4CAF50',
  neutral: '#FF9800',
  negative: '#F44336',
};

const SENTIMENT_LABELS: Record<string, string> = {
  positive: 'Positivo',
  neutral: 'Neutro',
  negative: 'Negativo',
};

export function AdminScreen() {
  const { colors: c } = useTheme();
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
    } catch (e: any) {
      setError(e?.message ?? 'Error cargando stats');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const s = styles(c);

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color={c.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={s.center}>
        <Text style={s.errorText}>{error}</Text>
      </View>
    );
  }

  if (!stats) return null;

  const totalSentiment = stats.sentiment_distribution.reduce((acc, x) => acc + x.count, 0) || 1;
  const totalIntents = stats.intent_distribution.reduce((acc, x) => acc + x.count, 0) || 1;

  return (
    <ScrollView
      style={s.scroll}
      contentContainerStyle={s.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => load(true)}
          tintColor={c.primary}
        />
      }
    >
      <Text style={s.pageTitle}>Panel Admin</Text>

      {/* KPI cards */}
      <View style={s.row}>
        <StatCard label="Usuarios" value={stats.total_users} color={c.primary} colors={c} />
        <StatCard label="Conversaciones" value={stats.total_conversations} color="#9C27B0" colors={c} />
        <StatCard label="Mensajes" value={stats.total_messages} color="#2196F3" colors={c} />
      </View>

      {/* Sentiment */}
      {stats.sentiment_distribution.length > 0 && (
        <Section title="Sentimiento" colors={c}>
          <View style={s.barContainer}>
            {stats.sentiment_distribution.map((item) => {
              const pct = Math.round((item.count / totalSentiment) * 100);
              const color = SENTIMENT_COLORS[item.sentiment] ?? c.primary;
              const label = SENTIMENT_LABELS[item.sentiment] ?? item.sentiment;
              return (
                <View key={item.sentiment} style={s.barRow}>
                  <Text style={[s.barLabel, { color: c.onSurface }]}>{label}</Text>
                  <View style={s.barTrack}>
                    <View style={[s.barFill, { width: `${pct}%`, backgroundColor: color }]} />
                  </View>
                  <Text style={[s.barPct, { color: c.onSurfaceMuted }]}>{pct}%</Text>
                </View>
              );
            })}
          </View>
        </Section>
      )}

      {/* Intent distribution */}
      {stats.intent_distribution.length > 0 && (
        <Section title="Peticiones más frecuentes" colors={c}>
          <View style={s.barContainer}>
            {stats.intent_distribution.slice(0, 7).map((item) => {
              const pct = Math.round((item.count / totalIntents) * 100);
              return (
                <View key={item.intent} style={s.barRow}>
                  <Text style={[s.barLabel, { color: c.onSurface }]} numberOfLines={1}>
                    {item.intent.replace(/_/g, ' ')}
                  </Text>
                  <View style={s.barTrack}>
                    <View style={[s.barFill, { width: `${pct}%`, backgroundColor: c.primary }]} />
                  </View>
                  <Text style={[s.barPct, { color: c.onSurfaceMuted }]}>{item.count}</Text>
                </View>
              );
            })}
          </View>
        </Section>
      )}

      {/* Daily activity */}
      {stats.daily_activity.length > 0 && (
        <Section title="Actividad últimos 14 días" colors={c}>
          <View style={s.activityGrid}>
            {stats.daily_activity.map((d) => {
              const max = Math.max(...stats.daily_activity.map((x) => x.messages), 1);
              const heightPct = Math.max((d.messages / max) * 60, 4);
              return (
                <View key={d.day} style={s.activityCol}>
                  <Text style={[s.activityCount, { color: c.onSurfaceMuted }]}>{d.messages}</Text>
                  <View style={[s.activityBar, { height: heightPct, backgroundColor: c.primary }]} />
                  <Text style={[s.activityDay, { color: c.onSurfaceMuted }]}>
                    {d.day.slice(5)}
                  </Text>
                </View>
              );
            })}
          </View>
        </Section>
      )}

      {/* Top users */}
      {stats.top_users.length > 0 && (
        <Section title="Usuarios más activos" colors={c}>
          {stats.top_users.slice(0, 5).map((u, i) => (
            <View key={u.email} style={[s.userRow, { borderBottomColor: c.outline }]}>
              <View style={[s.userRank, { backgroundColor: c.primary }]}>
                <Text style={s.userRankText}>{i + 1}</Text>
              </View>
              <View style={s.userInfo}>
                <Text style={[s.userName, { color: c.onSurface }]} numberOfLines={1}>
                  {u.name || u.email}
                </Text>
                <Text style={[s.userEmail, { color: c.onSurfaceMuted }]} numberOfLines={1}>
                  {u.email}
                </Text>
              </View>
              <Text style={[s.userConvs, { color: c.primary }]}>{u.conversations} conv.</Text>
            </View>
          ))}
        </Section>
      )}
    </ScrollView>
  );
}

function StatCard({
  label,
  value,
  color,
  colors,
}: {
  label: string;
  value: number;
  color: string;
  colors: any;
}) {
  return (
    <View style={[cardStyles.card, { backgroundColor: colors.surface, borderColor: colors.outline }]}>
      <Text style={[cardStyles.value, { color }]}>{value}</Text>
      <Text style={[cardStyles.label, { color: colors.onSurfaceMuted }]}>{label}</Text>
    </View>
  );
}

function Section({
  title,
  children,
  colors,
}: {
  title: string;
  children: React.ReactNode;
  colors: any;
}) {
  return (
    <View style={[sectionStyles.container, { backgroundColor: colors.surface, borderColor: colors.outline }]}>
      <Text style={[sectionStyles.title, { color: colors.onSurface }]}>{title}</Text>
      {children}
    </View>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    flex: 1,
    marginHorizontal: 4,
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    alignItems: 'center',
  },
  value: {
    fontSize: 26,
    fontWeight: '700',
  },
  label: {
    fontSize: 11,
    marginTop: 2,
    textAlign: 'center',
  },
});

const sectionStyles = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 12,
  },
});

const styles = (c: any) =>
  StyleSheet.create({
    scroll: { flex: 1, backgroundColor: c.background },
    content: { padding: 16, paddingBottom: 32 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: c.background },
    errorText: { color: '#F44336', fontSize: 14 },
    pageTitle: { fontSize: 22, fontWeight: '700', color: c.onSurface, marginBottom: 16 },
    row: { flexDirection: 'row', marginBottom: 12 },
    barContainer: { gap: 10 },
    barRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    barLabel: { width: 110, fontSize: 12 },
    barTrack: { flex: 1, height: 10, backgroundColor: c.outline, borderRadius: 5, overflow: 'hidden' },
    barFill: { height: 10, borderRadius: 5, minWidth: 4 },
    barPct: { width: 36, fontSize: 11, textAlign: 'right' },
    activityGrid: { flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 90 },
    activityCol: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', gap: 2 },
    activityCount: { fontSize: 9 },
    activityBar: { width: '100%', borderRadius: 3 },
    activityDay: { fontSize: 8 },
    userRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, gap: 10 },
    userRank: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    userRankText: { color: '#fff', fontSize: 11, fontWeight: '700' },
    userInfo: { flex: 1 },
    userName: { fontSize: 13, fontWeight: '600' },
    userEmail: { fontSize: 11, marginTop: 1 },
    userConvs: { fontSize: 12, fontWeight: '600' },
  });
