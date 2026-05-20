import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useColors } from '../theme/ThemeContext';

interface Props {
  title: string;
  line1: string;
  line2?: string;
}

export function ListCard({ title, line1, line2 }: Props) {
  const c = useColors();
  return (
    <View style={[styles.card, { backgroundColor: c.surface }]}>
      <Text style={[styles.title, { color: c.onSurface }]}>{title}</Text>
      <Text style={[styles.line, { color: c.onSurfaceMuted }]}>{line1}</Text>
      {line2 ? <Text style={[styles.line, { color: c.onSurfaceMuted, opacity: 0.75 }]}>{line2}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 12, padding: 14, gap: 4 },
  title: { fontSize: 14, fontWeight: '600' },
  line: { fontSize: 13 },
});
