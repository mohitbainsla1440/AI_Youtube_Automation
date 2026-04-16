import React from 'react';
import {
  TouchableOpacity,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { COLORS } from '@/utils/constants';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  style,
  textStyle,
}: ButtonProps) {
  const handlePress = async () => {
    if (disabled || loading) return;
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  const sizeStyles = {
    sm: { height: 36, paddingHorizontal: 12, fontSize: 13 },
    md: { height: 48, paddingHorizontal: 20, fontSize: 15 },
    lg: { height: 56, paddingHorizontal: 28, fontSize: 17 },
  }[size];

  const isDisabled = disabled || loading;

  if (variant === 'primary') {
    return (
      <TouchableOpacity
        onPress={handlePress}
        disabled={isDisabled}
        style={[fullWidth && styles.fullWidth, style]}
        activeOpacity={0.85}
      >
        <LinearGradient
          colors={isDisabled ? ['#3730a3', '#3730a3'] : ['#6366f1', '#4f46e5']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[
            styles.base,
            { height: sizeStyles.height, paddingHorizontal: sizeStyles.paddingHorizontal },
            fullWidth && styles.fullWidth,
            isDisabled && styles.disabled,
          ]}
        >
          {loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              {icon && iconPosition === 'left' && icon}
              <Text style={[styles.textPrimary, { fontSize: sizeStyles.fontSize }, textStyle]}>
                {label}
              </Text>
              {icon && iconPosition === 'right' && icon}
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  const variantStyle: Record<Variant, ViewStyle> = {
    primary: {},
    secondary: { backgroundColor: COLORS.elevated },
    outline: { backgroundColor: 'transparent', borderWidth: 1, borderColor: COLORS.border },
    ghost: { backgroundColor: 'transparent' },
    danger: { backgroundColor: '#FF444420', borderWidth: 1, borderColor: '#FF4444' },
  };

  const variantTextColor: Record<Variant, string> = {
    primary: '#fff',
    secondary: COLORS.text,
    outline: COLORS.primaryLight,
    ghost: COLORS.textSecondary,
    danger: COLORS.error,
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={isDisabled}
      style={[
        styles.base,
        { height: sizeStyles.height, paddingHorizontal: sizeStyles.paddingHorizontal },
        variantStyle[variant],
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        style,
      ]}
      activeOpacity={0.75}
    >
      {loading ? (
        <ActivityIndicator color={variantTextColor[variant]} size="small" />
      ) : (
        <>
          {icon && iconPosition === 'left' && icon}
          <Text
            style={[
              styles.textBase,
              { fontSize: sizeStyles.fontSize, color: variantTextColor[variant] },
              textStyle,
            ]}
          >
            {label}
          </Text>
          {icon && iconPosition === 'right' && icon}
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    gap: 8,
  },
  fullWidth: { width: '100%' },
  disabled: { opacity: 0.5 },
  textPrimary: { color: '#fff', fontWeight: '600' },
  textBase: { fontWeight: '600' },
});
