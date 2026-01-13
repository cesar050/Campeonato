// src/components/ErrorScreen.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import colors from '../theme/colors';
import { fontSize, spacing, borderRadius, touchTargetSize } from '../theme/spacing';

interface ErrorScreenProps {
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
}

export const ErrorScreen: React.FC<ErrorScreenProps> = ({ 
  message, 
  onRetry,
  retryLabel = 'Reintentar'
}) => {
  return (
    <View style={styles.container} accessibilityRole="alert">
      <Text style={styles.icon}>❌</Text>
      <Text style={styles.message}>{message}</Text>
      {onRetry && (
        <TouchableOpacity 
          style={styles.button} 
          onPress={onRetry}
          accessibilityRole="button"
          accessibilityLabel={retryLabel}
          accessibilityHint="Presiona dos veces para reintentar la operación"
        >
          <Text style={styles.buttonText}>{retryLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  icon: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  message: {
    marginTop: spacing.md,
    fontSize: fontSize.lg,
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  button: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    minHeight: touchTargetSize,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    color: colors.textOnPrimary,
    fontSize: fontSize.lg,
    fontWeight: '600',
  },
});
