import React from 'react';
import { View, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS } from '@/utils/constants';

interface GradientCardProps {
  children: React.ReactNode;
  gradient?: [string, string, ...string[]];
  style?: ViewStyle;
  onPress?: () => void;
  padding?: number;
  border?: boolean;
}

export function GradientCard({
  children,
  gradient,
  style,
  onPress,
  padding = 16,
  border = false,
}: GradientCardProps) {
  const content = gradient ? (
    <LinearGradient
      colors={gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.card, border && styles.border, { padding }, style]}
    >
      {children}
    </LinearGradient>
  ) : (
    <View
      style={[
        styles.card,
        { backgroundColor: COLORS.card, padding },
        border && styles.border,
        style,
      ]}
    >
      {children}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  border: {
    borderWidth: 1,
    borderColor: COLORS.border,
  },
});
