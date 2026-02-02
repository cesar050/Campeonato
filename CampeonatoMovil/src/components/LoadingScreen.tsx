// src/components/LoadingScreen.tsx
import React from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import colors from '../theme/colors';
import { fontSize, spacing } from '../theme/spacing';

interface LoadingScreenProps {
  message?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ 
  message = 'Cargando...' 
}) => {
  return (
    <View style={styles.container} accessibilityRole="progressbar">
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.message}>{message}</Text>
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
  message: {
    marginTop: spacing.md,
    fontSize: fontSize.lg,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
