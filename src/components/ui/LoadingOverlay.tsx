import React from 'react';
import { View, Text, StyleSheet, Modal, ActivityIndicator } from 'react-native';
import { BlurView } from 'expo-blur';
import { ProgressBar } from './ProgressBar';
import { COLORS } from '@/utils/constants';

interface LoadingOverlayProps {
  visible: boolean;
  message?: string;
  progress?: number;
  stage?: string;
}

export function LoadingOverlay({ visible, message, progress, stage }: LoadingOverlayProps) {
  return (
    <Modal visible={visible} transparent animationType="fade">
      <BlurView intensity={40} style={styles.blur}>
        <View style={styles.card}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          {stage && <Text style={styles.stage}>{stage}</Text>}
          {message && <Text style={styles.message}>{message}</Text>}
          {progress !== undefined && (
            <ProgressBar progress={progress} color={COLORS.primary} showPercent animated />
          )}
        </View>
      </BlurView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  blur: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 28,
    width: 260,
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  stage: { color: COLORS.primaryLight, fontSize: 13, fontWeight: '600' },
  message: { color: COLORS.textSecondary, fontSize: 14, textAlign: 'center' },
});
