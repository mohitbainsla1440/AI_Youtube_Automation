import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { getStatusColor } from '@/utils/helpers';
import { VideoStatus } from '@/types';

interface BadgeProps {
  label: string;
  color?: string;
  status?: VideoStatus;
  size?: 'sm' | 'md';
  dot?: boolean;
}

export function Badge({ label, color, status, size = 'md', dot = false }: BadgeProps) {
  const badgeColor = color ?? (status ? getStatusColor(status) : '#6B7280');
  const isSmall = size === 'sm';

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: `${badgeColor}20`,
          borderColor: `${badgeColor}40`,
          paddingHorizontal: isSmall ? 6 : 10,
          paddingVertical: isSmall ? 2 : 4,
        },
      ]}
    >
      {dot && (
        <View
          style={[styles.dot, { backgroundColor: badgeColor, width: isSmall ? 5 : 6, height: isSmall ? 5 : 6 }]}
        />
      )}
      <Text style={[styles.text, { color: badgeColor, fontSize: isSmall ? 10 : 12 }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 100,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  dot: {
    borderRadius: 100,
  },
  text: {
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
