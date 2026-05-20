import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useColors } from '../theme/ThemeContext';

interface Props {
  title: string;
  subtitle?: string;
}

export function SectionCard({ title, subtitle }: Props) {
  const c = useColors();
  return (
    <View style={[styles.wrap, { backgroundColor: c.surface }]}>
      <Text style={[styles.title, { color: c.onSurface }]}>{title}</Text>
      {subtitle ? <Text style={[styles.sub, { color: c.onSurfaceMuted }]}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { borderRadius: 14, padding: 16, gap: 4 },
  title: { fontSize: 18, fontWeight: '700' },
  sub: { fontSize: 13 },
});
