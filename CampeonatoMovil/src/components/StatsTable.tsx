// src/components/StatsTable.tsx
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import colors from '../theme/colors';
import { fontSize, spacing, borderRadius } from '../theme/spacing';

interface TableColumn {
  key: string;
  label: string;
  width?: number;
  align?: 'left' | 'center' | 'right';
}

interface TableRow {
  [key: string]: string | number | React.ReactNode;
}

interface StatsTableProps {
  columns: TableColumn[];
  data: TableRow[];
  title?: string;
}

export const StatsTable: React.FC<StatsTableProps> = ({ 
  columns, 
  data, 
  title 
}) => {
  const getAlignStyle = (align: 'left' | 'center' | 'right' = 'left') => {
    switch (align) {
      case 'center':
        return styles.centerAlign;
      case 'right':
        return styles.rightAlign;
      default:
        return styles.leftAlign;
    }
  };

  return (
    <View style={styles.container}>
      {title && <Text style={styles.title}>{title}</Text>}
      <ScrollView horizontal showsHorizontalScrollIndicator={true}>
        <View style={styles.table}>
          <View style={styles.header}>
            {columns.map((column, index) => (
              <View
                key={column.key}
                style={[
                  styles.headerCell,
                  getAlignStyle(column.align),
                  column.width && { width: column.width },
                ]}
              >
                <Text style={styles.headerText}>{column.label}</Text>
              </View>
            ))}
          </View>
          {data.map((row, rowIndex) => (
            <View
              key={rowIndex}
              style={[
                styles.row,
                rowIndex % 2 === 0 && styles.rowEven,
              ]}
            >
              {columns.map((column) => (
                <View
                  key={column.key}
                  style={[
                    styles.cell,
                    getAlignStyle(column.align),
                    column.width && { width: column.width },
                  ]}
                >
                  {typeof row[column.key] === 'object' ? (
                    row[column.key]
                  ) : (
                    <Text style={styles.cellText}>{row[column.key]}</Text>
                  )}
                </View>
              ))}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.md,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  table: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerCell: {
    padding: spacing.md,
    minWidth: 80,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  headerText: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textOnPrimary,
    textTransform: 'uppercase',
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  rowEven: {
    backgroundColor: colors.surfaceVariant,
  },
  cell: {
    padding: spacing.md,
    minWidth: 80,
    borderRightWidth: 1,
    borderRightColor: colors.border,
  },
  cellText: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
  leftAlign: {
    alignItems: 'flex-start',
  },
  centerAlign: {
    alignItems: 'center',
  },
  rightAlign: {
    alignItems: 'flex-end',
  },
});
