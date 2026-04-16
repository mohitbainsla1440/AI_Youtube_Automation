import React from 'react';
import { View, Image, Text, StyleSheet } from 'react-native';
import { COLORS } from '@/utils/constants';

interface AvatarProps {
  uri?: string;
  name?: string;
  size?: number;
  color?: string;
}

export function Avatar({ uri, name, size = 40, color = COLORS.primary }: AvatarProps) {
  const initials = name
    ? name.split(' ').map((w) => w[0]?.toUpperCase()).slice(0, 2).join('')
    : '?';

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={[styles.image, { width: size, height: size, borderRadius: size / 2 }]}
      />
    );
  }

  return (
    <View
      style={[
        styles.placeholder,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: `${color}30` },
      ]}
    >
      <Text style={[styles.initials, { fontSize: size * 0.35, color }]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  image: { borderWidth: 1, borderColor: COLORS.border },
  placeholder: { alignItems: 'center', justifyContent: 'center' },
  initials: { fontWeight: '700' },
});
