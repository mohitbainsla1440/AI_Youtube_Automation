import React, { useState } from 'react';
import {
  View,
  TextInput,
  Text,
  StyleSheet,
  TextInputProps,
  TouchableOpacity,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/utils/constants';

interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
  containerStyle?: ViewStyle;
  isPassword?: boolean;
  required?: boolean;
}

export function Input({
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  onRightIconPress,
  containerStyle,
  isPassword = false,
  required = false,
  ...props
}: InputProps) {
  const [focused, setFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const borderColor = error
    ? COLORS.error
    : focused
    ? COLORS.primary
    : COLORS.border;

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Text style={styles.label}>
          {label}
          {required && <Text style={{ color: COLORS.error }}> *</Text>}
        </Text>
      )}

      <View
        style={[
          styles.inputWrapper,
          { borderColor },
          focused && styles.inputFocused,
        ]}
      >
        {leftIcon && (
          <Ionicons
            name={leftIcon}
            size={18}
            color={focused ? COLORS.primaryLight : COLORS.textMuted}
            style={styles.leftIcon}
          />
        )}

        <TextInput
          {...props}
          style={[styles.input, props.style]}
          placeholderTextColor={COLORS.textMuted}
          onFocus={(e) => {
            setFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            props.onBlur?.(e);
          }}
          secureTextEntry={isPassword && !showPassword}
        />

        {(isPassword || rightIcon) && (
          <TouchableOpacity
            onPress={isPassword ? () => setShowPassword((v) => !v) : onRightIconPress}
            style={styles.rightIcon}
          >
            <Ionicons
              name={
                isPassword
                  ? showPassword
                    ? 'eye-off-outline'
                    : 'eye-outline'
                  : (rightIcon ?? 'close')
              }
              size={18}
              color={COLORS.textMuted}
            />
          </TouchableOpacity>
        )}
      </View>

      {error && <Text style={styles.error}>{error}</Text>}
      {hint && !error && <Text style={styles.hint}>{hint}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6 },
  label: { color: COLORS.textSecondary, fontSize: 13, fontWeight: '500' },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.elevated,
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 48,
    paddingHorizontal: 14,
  },
  inputFocused: {
    backgroundColor: `${COLORS.primary}10`,
  },
  leftIcon: { marginRight: 8 },
  rightIcon: { marginLeft: 8, padding: 4 },
  input: {
    flex: 1,
    color: COLORS.text,
    fontSize: 15,
    paddingVertical: 12,
  },
  error: { color: COLORS.error, fontSize: 12 },
  hint: { color: COLORS.textMuted, fontSize: 12 },
});
