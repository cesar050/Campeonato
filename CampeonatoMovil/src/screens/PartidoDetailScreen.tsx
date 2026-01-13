// src/screens/PartidoDetailScreen.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { partidoService } from '../services/api';
import { Partido } from '../types';
import { Header } from '../components/Header';
import { LoadingScreen } from '../components/LoadingScreen';
import { ErrorScreen } from '../components/ErrorScreen';
import { Badge } from '../components/Badge';
import colors from '../theme/colors';
import { fontSize, spacing, borderRadius } from '../theme/spacing';

type NavigationProp = StackNavigationProp<RootStackParamList>;
type RouteProp = RouteProp<RootStackParamList, 'PartidoDetail'>;

export const PartidoDetailScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp>();
  const { partidoId } = route.params;
  
  const [partido, setPartido] = useState<Partido | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPartido = useCallback(async () => {
    try {
      setError(null);
      const response = await partidoService.getById(partidoId);
      setPartido(response.data);
    } catch (err) {
      console.error('Error al cargar partido:', err);
      setError('No se pudo cargar el partido');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [partidoId]);

  useEffect(() => {
    loadPartido();
  }, [loadPartido]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadPartido();
  }, [loadPartido]);

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
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Header title="Detalle del Partido" onBack={() => navigation.goBack()} />
        <LoadingScreen message="Cargando partido..." />
      </View>
    );
  }

  if (error || !partido) {
    return (
      <View style={styles.container}>
        <Header title="Detalle del Partido" onBack={() => navigation.goBack()} />
        <ErrorScreen 
          message={error || 'Partido no encontrado'} 
          onRetry={loadPartido} 
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header title="Detalle del Partido" onBack={() => navigation.goBack()} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.matchCard}>
          <View style={styles.matchHeader}>
            <Text style={styles.matchTitle}>Partido</Text>
            <Badge
              label={getEstadoLabel(partido.estado)}
              backgroundColor={getEstadoColor(partido.estado)}
            />
          </View>
          
          <View style={styles.matchContent}>
            <View style={styles.teamSection}>
              <Text style={styles.teamName} numberOfLines={2}>
                {partido.equipo_local?.nombre || 'Local'}
              </Text>
              <Text style={styles.score}>{partido.goles_local ?? '-'}</Text>
            </View>
            
            <Text style={styles.vs}>VS</Text>
            
            <View style={styles.teamSection}>
              <Text style={styles.score}>{partido.goles_visitante ?? '-'}</Text>
              <Text style={styles.teamName} numberOfLines={2}>
                {partido.equipo_visitante?.nombre || 'Visitante'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.infoCard}>
          <Text style={styles.cardTitle}>Información</Text>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Fecha y Hora:</Text>
            <Text style={styles.infoValue}>{formatDateTime(partido.fecha_hora)}</Text>
          </View>
          
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Estado:</Text>
            <Badge
              label={getEstadoLabel(partido.estado)}
              backgroundColor={getEstadoColor(partido.estado)}
            />
          </View>
          
          {partido.cancha && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Cancha:</Text>
              <Text style={styles.infoValue}>{partido.cancha}</Text>
            </View>
          )}
          
          {partido.arbitro && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Árbitro:</Text>
              <Text style={styles.infoValue}>{partido.arbitro}</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: spacing.md,
  },
  matchCard: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    elevation: 2,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  matchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  matchTitle: {
    fontSize: fontSize.xl,
    fontWeight: '600',
    color: colors.text,
  },
  matchContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  teamSection: {
    flex: 1,
    alignItems: 'center',
  },
  teamName: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.text,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  score: {
    fontSize: fontSize.xxxl,
    fontWeight: 'bold',
    color: colors.primary,
  },
  vs: {
    fontSize: fontSize.xl,
    fontWeight: '600',
    color: colors.textSecondary,
    marginHorizontal: spacing.lg,
  },
  infoCard: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    elevation: 2,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  cardTitle: {
    fontSize: fontSize.xl,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoLabel: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  infoValue: {
    fontSize: fontSize.md,
    color: colors.text,
    flex: 1,
    textAlign: 'right',
    marginLeft: spacing.md,
  },
});
