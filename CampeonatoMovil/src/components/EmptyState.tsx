// src/components/EmptyState.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import colors from '../theme/colors';
import { fontSize, spacing } from '../theme/spacing';

interface EmptyStateProps {
  icon?: string;
  title: string;
  message?: string;
}

const iconMap: { [key: string]: string } = {
  'inbox': 'inbox',
  'emoji-events': 'emoji-events',
  'sports-soccer': 'sports-soccer',
  'groups': 'groups',
  'leaderboard': 'leaderboard',
  'warning': 'warning',
  'person': 'person',
};

export const EmptyState: React.FC<EmptyStateProps> = ({ 
  icon = 'inbox',
  title,
  message 
}) => {
  const iconName = iconMap[icon] || 'description';
  
  return (
    <View style={styles.container} accessibilityRole="text">
      <Icon name={iconName} size={64} color="#9E9E9E" />
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
