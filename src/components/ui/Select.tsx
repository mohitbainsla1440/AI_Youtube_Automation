import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  FlatList,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { COLORS } from '@/utils/constants';

interface SelectOption<T> {
  value: T;
  label: string;
  description?: string;
  icon?: string;
  color?: string;
}

interface SelectProps<T> {
  label?: string;
  options: SelectOption<T>[];
  value: T;
  onChange: (value: T) => void;
  placeholder?: string;
  style?: ViewStyle;
}

export function Select<T extends string | number>({
  label,
  options,
  value,
  onChange,
  placeholder = 'Select...',
  style,
}: SelectProps<T>) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}

      <TouchableOpacity style={styles.trigger} onPress={() => setOpen(true)} activeOpacity={0.8}>
        <View style={styles.triggerContent}>
          {selected?.icon && <Text style={styles.icon}>{selected.icon}</Text>}
          <Text style={selected ? styles.selected : styles.placeholder}>
            {selected?.label ?? placeholder}
          </Text>
        </View>
        <Ionicons name="chevron-down" size={16} color={COLORS.textMuted} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <BlurView intensity={20} style={styles.backdrop}>
          <TouchableOpacity style={styles.backdropTouch} onPress={() => setOpen(false)} />
          <View style={styles.sheet}>
            {label && <Text style={styles.sheetTitle}>{label}</Text>}
            <FlatList
              data={options}
              keyExtractor={(item) => String(item.value)}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.option,
                    item.value === value && styles.optionSelected,
                  ]}
                  onPress={() => {
                    onChange(item.value);
                    setOpen(false);
                  }}
                >
                  {item.icon && <Text style={styles.optionIcon}>{item.icon}</Text>}
                  <View style={styles.optionText}>
                    <Text
                      style={[
                        styles.optionLabel,
                        item.value === value && { color: COLORS.primary },
                      ]}
                    >
                      {item.label}
                    </Text>
                    {item.description && (
                      <Text style={styles.optionDesc}>{item.description}</Text>
                    )}
                  </View>
                  {item.value === value && (
                    <Ionicons name="checkmark" size={18} color={COLORS.primary} />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </BlurView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6 },
  label: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '500' },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: COLORS.elevated,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 13,
    minHeight: 48,
  },
  triggerContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  icon: { fontSize: 16 },
  selected: { color: COLORS.text, fontSize: 15 },
  placeholder: { color: COLORS.textMuted, fontSize: 15 },
  backdrop: { flex: 1, justifyContent: 'flex-end' },
  backdropTouch: { flex: 1 },
  sheet: {
    backgroundColor: COLORS.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '60%',
    borderTopWidth: 1,
    borderColor: COLORS.border,
  },
  sheetTitle: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
    textAlign: 'center',
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 12,
    gap: 12,
  },
  optionSelected: { backgroundColor: `${COLORS.primary}15` },
  optionIcon: { fontSize: 20 },
  optionText: { flex: 1 },
  optionLabel: { color: COLORS.text, fontSize: 15, fontWeight: '500' },
  optionDesc: { color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
});
