import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import { COLORS } from '@/utils/constants';

interface ProgressBarProps {
  progress: number; // 0–100
  color?: string;
  label?: string;
  showPercent?: boolean;
  height?: number;
  animated?: boolean;
  striped?: boolean;
}

export function ProgressBar({
  progress,
  color = COLORS.primary,
  label,
  showPercent = false,
  height = 6,
  animated = true,
  striped = false,
}: ProgressBarProps) {
  const widthAnim = useRef(new Animated.Value(0)).current;
  const clampedProgress = Math.min(100, Math.max(0, progress));

  useEffect(() => {
    if (animated) {
      Animated.spring(widthAnim, {
        toValue: clampedProgress,
        useNativeDriver: false,
        tension: 40,
        friction: 8,
      }).start();
    } else {
      widthAnim.setValue(clampedProgress);
    }
  }, [clampedProgress, animated, widthAnim]);

  const width = animated
    ? widthAnim.interpolate({ inputRange: [0, 100], outputRange: ['0%', '100%'] })
    : `${clampedProgress}%`;

  return (
    <View style={styles.container}>
      {(label || showPercent) && (
        <View style={styles.header}>
          {label && <Text style={styles.label}>{label}</Text>}
          {showPercent && (
            <Text style={[styles.percent, { color }]}>{Math.round(clampedProgress)}%</Text>
          )}
        </View>
      )}
      <View style={[styles.track, { height }]}>
        <Animated.View
          style={[
            styles.fill,
            {
              width,
              height,
              backgroundColor: color,
            },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6 },
  header: { flexDirection: 'row', justifyContent: 'space-between' },
  label: { color: COLORS.textSecondary, fontSize: 13 },
  percent: { fontSize: 13, fontWeight: '600' },
  track: {
    backgroundColor: COLORS.elevated,
    borderRadius: 100,
    overflow: 'hidden',
  },
  fill: { borderRadius: 100 },
});
