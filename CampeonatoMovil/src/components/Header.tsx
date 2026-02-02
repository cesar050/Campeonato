// src/components/Header.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import colors from '../theme/colors';
import { fontSize, spacing, touchTargetSize } from '../theme/spacing';

interface HeaderProps {
  title: string;
  onBack?: () => void;
  rightAction?: {
    icon: string;
    onPress: () => void;
    accessibilityLabel: string;
  };
}

export const Header: React.FC<HeaderProps> = ({ title, onBack, rightAction }) => {
  return (
    <View style={styles.container} accessibilityRole="header">
      {onBack && (
        <TouchableOpacity
          style={styles.backButton}
          onPress={onBack}
          accessibilityRole="button"
          accessibilityLabel="Volver"
          accessibilityHint="Presiona dos veces para volver a la pantalla anterior"
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
      )}
      <Text style={styles.title} numberOfLines={1} accessibilityRole="header">
        {title}
      </Text>
      {rightAction && (
        <TouchableOpacity
          style={styles.rightButton}
          onPress={rightAction.onPress}
          accessibilityRole="button"
          accessibilityLabel={rightAction.accessibilityLabel}
        >
          <Text style={styles.iconText}>{rightAction.icon}</Text>
        </TouchableOpacity>
      )}
      {!rightAction && onBack && <View style={styles.placeholder} />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    minHeight: 56,
    elevation: 4,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  backButton: {
    width: touchTargetSize,
    height: touchTargetSize,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  title: {
    flex: 1,
    fontSize: fontSize.xl,
    fontWeight: '600',
    color: colors.textOnPrimary,
    marginHorizontal: spacing.sm,
  },
  rightButton: {
    width: touchTargetSize,
    height: touchTargetSize,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
  placeholder: {
    width: touchTargetSize,
  },
  backIcon: {
    fontSize: 28,
    color: colors.textOnPrimary,
    fontWeight: 'bold',
  },
  iconText: {
    fontSize: 24,
    color: colors.textOnPrimary,
  },
});
