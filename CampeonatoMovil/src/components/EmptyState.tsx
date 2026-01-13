// src/components/EmptyState.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import colors from '../theme/colors';
import { fontSize, spacing } from '../theme/spacing';

interface EmptyStateProps {
  icon?: string;
  title: string;
  message?: string;
}

const iconMap: { [key: string]: string } = {
  'inbox': '📥',
  'emoji-events': '🏆',
  'sports-soccer': '⚽',
  'groups': '👥',
  'leaderboard': '📊',
  'warning': '⚠️',
  'person': '👤',
};

export const EmptyState: React.FC<EmptyStateProps> = ({ 
  icon = 'inbox',
  title,
  message 
}) => {
  const iconEmoji = iconMap[icon] || '📋';
  
  return (
    <View style={styles.container} accessibilityRole="text">
      <Text style={styles.icon}>{iconEmoji}</Text>
      <Text style={styles.title}>{title}</Text>
      {message && <Text style={styles.message}>{message}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    minHeight: 200,
  },
  icon: {
    fontSize: 64,
    marginBottom: spacing.md,
  },
  title: {
    marginTop: spacing.md,
    fontSize: fontSize.xl,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
  },
  message: {
    marginTop: spacing.sm,
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    maxWidth: 300,
  },
});
