import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { IconSparkles } from '@tabler/icons-react-native';
import { useColors } from '../theme/ThemeContext';

export function StellaFAB() {
  const navigation = useNavigation();
  const c = useColors();
  return (
    <TouchableOpacity
      onPress={() => navigation.navigate('Stella' as never)}
      style={[styles.fab, { backgroundColor: c.primary }]}
      activeOpacity={0.85}
    >
      <IconSparkles size={26} color="#fff" />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#8B5CF6',
    shadowOpacity: 0.5,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
});
