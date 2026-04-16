import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { GradientCard } from './GradientCard';
import { COLORS } from '@/utils/constants';

interface StatCardProps {
  label: string;
  value: string;
  change?: number; // positive = growth
  icon: keyof typeof Ionicons.glyphMap;
  color?: string;
  onPress?: () => void;
}

export function StatCard({ label, value, change, icon, color = COLORS.primary, onPress }: StatCardProps) {
  const isPositive = change !== undefined && change >= 0;

  return (
    <GradientCard border style={styles.card} onPress={onPress}>
      <View style={[styles.iconWrap, { backgroundColor: `${color}20` }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
      {change !== undefined && (
        <View style={styles.changeRow}>
          <Ionicons
            name={isPositive ? 'trending-up' : 'trending-down'}
            size={12}
            color={isPositive ? COLORS.success : COLORS.error}
          />
          <Text
            style={[styles.change, { color: isPositive ? COLORS.success : COLORS.error }]}
          >
            {Math.abs(change).toFixed(1)}%
          </Text>
        </View>
      )}
    </GradientCard>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, gap: 6, minWidth: 140 },
  iconWrap: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  value: { color: COLORS.text, fontSize: 22, fontWeight: '700' },
  label: { color: COLORS.textSecondary, fontSize: 12 },
  changeRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  change: { fontSize: 11, fontWeight: '600' },
});
