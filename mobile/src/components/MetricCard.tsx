import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useColors } from '../theme/ThemeContext';

interface Props {
  label: string;
  value: string;
  accent?: string;
}

export function MetricCard({ label, value, accent }: Props) {
  const c = useColors();
  return (
    <View style={[styles.card, { backgroundColor: c.surface }]}>
      {accent && <View style={[styles.accentBar, { backgroundColor: accent }]} />}
      <Text style={[styles.value, { color: c.onSurface }]}>{value}</Text>
      <Text style={[styles.label, { color: c.onSurfaceMuted }]}>{label}</Text>
    </View>
  );
}

export function TwoColumnMetrics({ items }: { items: { label: string; value: string; accent?: string }[] }) {
  const rows: (typeof items)[] = [];
  for (let i = 0; i < items.length; i += 2) rows.push(items.slice(i, i + 2));
  return (
    <View style={{ gap: 10 }}>
      {rows.map((row, ri) => (
        <View key={ri} style={styles.row}>
          {row.map((item) => <MetricCard key={item.label} {...item} />)}
          {row.length === 1 && <View style={{ flex: 1 }} />}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, borderRadius: 14, padding: 16, gap: 4, overflow: 'hidden' },
  accentBar: { position: 'absolute', top: 0, left: 0, right: 0, height: 3, borderTopLeftRadius: 14, borderTopRightRadius: 14 },
  value: { fontSize: 32, fontWeight: '800', marginTop: 8 },
  label: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  row: { flexDirection: 'row', gap: 10 },
});
