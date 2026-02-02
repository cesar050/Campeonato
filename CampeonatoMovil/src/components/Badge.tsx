// src/components/Badge.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import colors from '../theme/colors';
import { fontSize, spacing, borderRadius } from '../theme/spacing';

interface BadgeProps {
  label: string;
  variant?: 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info';
  backgroundColor?: string;
  textColor?: string;
}

export const Badge: React.FC<BadgeProps> = ({ 
  label, 
  variant = 'primary',
  backgroundColor,
  textColor
}) => {
  const getBackgroundColor = () => {
    if (backgroundColor) return backgroundColor;
    switch (variant) {
      case 'primary':
        return colors.primary;
      case 'secondary':
        return colors.secondary;
      case 'success':
        return colors.success;
      case 'error':
        return colors.error;
      case 'warning':
        return colors.warning;
      case 'info':
        return colors.info;
      default:
        return colors.primary;
    }
  };

  const getTextColor = () => {
    if (textColor) return textColor;
    return colors.textOnPrimary;
  };

  return (
    <View 
      style={[
        styles.badge, 
        { backgroundColor: getBackgroundColor() }
      ]}
      accessibilityRole="text"
      accessibilityLabel={label}
    >
      <Text style={[styles.text, { color: getTextColor() }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs / 2,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: fontSize.xs,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
});
