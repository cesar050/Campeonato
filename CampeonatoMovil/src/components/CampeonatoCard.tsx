// src/components/CampeonatoCard.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Campeonato } from '../types';
import { Badge } from './Badge';
import colors from '../theme/colors';
import { fontSize, spacing, borderRadius, touchTargetSize } from '../theme/spacing';

interface CampeonatoCardProps {
  campeonato: Campeonato;
  onPress: () => void;
}

export const CampeonatoCard: React.FC<CampeonatoCardProps> = ({ 
  campeonato, 
  onPress 
}) => {
  const getEstadoLabel = (estado: string) => {
    switch (estado) {
      case 'en_curso':
        return 'En Curso';
      case 'finalizado':
        return 'Finalizado';
      case 'planificacion':
        return 'Planificación';
      default:
        return estado;
    }
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'en_curso':
        return colors.estadoEnCurso;
      case 'finalizado':
        return colors.estadoFinalizado;
      case 'planificacion':
        return colors.estadoPlanificacion;
      default:
        return colors.textSecondary;
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Sin fecha';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-ES', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch {
      return dateString;
    }
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Campeonato ${campeonato.nombre}`}
      accessibilityHint="Presiona dos veces para ver detalles del campeonato"
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.nombre} numberOfLines={2}>
            {campeonato.nombre || 'Sin nombre'}
          </Text>
          <Badge
            label={getEstadoLabel(campeonato.estado)}
            backgroundColor={getEstadoColor(campeonato.estado)}
          />
        </View>
        
        <Text style={styles.deporte}>
          {campeonato.deporte_tipo === 'futbol' ? 'Fútbol' : 'Indoor'}
          {campeonato.tipo_competicion && ` • ${campeonato.tipo_competicion}`}
        </Text>
        
        <View style={styles.fechas}>
          <Text style={styles.fechaLabel}>Inicio:</Text>
          <Text style={styles.fecha}>{formatDate(campeonato.fecha_inicio)}</Text>
        </View>
        
        {campeonato.fecha_fin && (
          <View style={styles.fechas}>
            <Text style={styles.fechaLabel}>Fin:</Text>
            <Text style={styles.fecha}>{formatDate(campeonato.fecha_fin)}</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    minHeight: touchTargetSize,
    elevation: 2,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  nombre: {
    flex: 1,
    fontSize: fontSize.xl,
    fontWeight: '600',
    color: colors.text,
    marginRight: spacing.sm,
  },
  deporte: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  fechas: {
    flexDirection: 'row',
    marginBottom: spacing.xs / 2,
  },
  fechaLabel: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginRight: spacing.xs,
    fontWeight: '500',
  },
  fecha: {
    fontSize: fontSize.sm,
    color: colors.text,
  },
});
