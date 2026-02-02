// src/components/PartidoCard.tsx
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Partido } from '../types';
import { Badge } from './Badge';
import colors from '../theme/colors';
import { fontSize, spacing, borderRadius, touchTargetSize } from '../theme/spacing';

interface PartidoCardProps {
  partido: Partido;
  onPress: () => void;
}

export const PartidoCard: React.FC<PartidoCardProps> = ({ partido, onPress }) => {
  const getEstadoLabel = (estado: string) => {
    switch (estado) {
      case 'en_juego':
        return 'En Juego';
      case 'finalizado':
        return 'Finalizado';
      case 'programado':
        return 'Programado';
      case 'cancelado':
        return 'Cancelado';
      default:
        return estado;
    }
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'en_juego':
        return colors.estadoEnJuego;
      case 'finalizado':
        return colors.estadoFinalizado;
      case 'programado':
        return colors.estadoProgramado;
      case 'cancelado':
        return colors.estadoCancelado;
      default:
        return colors.textSecondary;
    }
  };

  const formatDateTime = (dateString: string) => {
    if (!dateString) return 'Sin fecha';
    try {
      const date = new Date(dateString);
      return date.toLocaleString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
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
      accessibilityLabel={`Partido ${partido.equipo_local?.nombre} vs ${partido.equipo_visitante?.nombre}`}
      accessibilityHint="Presiona dos veces para ver detalles del partido"
    >
      <View style={styles.matchContent}>
        <View style={styles.team}>
          <Text style={styles.teamName} numberOfLines={2}>
            {partido.equipo_local?.nombre || 'Local'}
          </Text>
          <Text style={styles.score}>{partido.goles_local ?? '-'}</Text>
        </View>
        
        <View style={styles.divider}>
          <Text style={styles.vs}>VS</Text>
        </View>
        
        <View style={styles.team}>
          <Text style={styles.score}>{partido.goles_visitante ?? '-'}</Text>
          <Text style={styles.teamName} numberOfLines={2}>
            {partido.equipo_visitante?.nombre || 'Visitante'}
          </Text>
        </View>
      </View>
      
      <View style={styles.footer}>
        <Text style={styles.date}>{formatDateTime(partido.fecha_hora)}</Text>
        <Badge
          label={getEstadoLabel(partido.estado)}
          backgroundColor={getEstadoColor(partido.estado)}
        />
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
    minHeight: touchTargetSize * 1.5,
    elevation: 2,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  matchContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  team: {
    flex: 1,
    alignItems: 'center',
  },
  teamName: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  score: {
    fontSize: fontSize.xxxl,
    fontWeight: 'bold',
    color: colors.primary,
  },
  divider: {
    marginHorizontal: spacing.md,
  },
  vs: {
    fontSize: fontSize.sm,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  date: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
});
