// src/screens/EquiposScreen.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, TouchableOpacity, Text } from 'react-native';
import { campeonatoService, equipoService } from '../services/api';
import { Campeonato, Equipo } from '../types';
import { Header } from '../components/Header';
import { LoadingScreen } from '../components/LoadingScreen';
import { ErrorScreen } from '../components/ErrorScreen';
import { EmptyState } from '../components/EmptyState';
import { Chip } from '../components/Chip';
import colors from '../theme/colors';
import { fontSize, spacing, borderRadius, touchTargetSize } from '../theme/spacing';

interface EquipoWithCampeonato extends Equipo {
  campeonato_nombre?: string;
}

export const EquiposScreen = () => {
  const [equipos, setEquipos] = useState<EquipoWithCampeonato[]>([]);
  const [campeonatos, setCampeonatos] = useState<Campeonato[]>([]);
  const [selectedCampeonatoId, setSelectedCampeonatoId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadCampeonatos();
  }, []);

  useEffect(() => {
    if (selectedCampeonatoId) {
      loadEquipos();
    } else {
      setEquipos([]);
    }
  }, [selectedCampeonatoId]);

  const loadCampeonatos = useCallback(async () => {
    try {
      const response = await campeonatoService.getPublicos();
      const data = response.data;
      const campeonatosList = data.campeonatos || data || [];
      setCampeonatos(campeonatosList);
    } catch (err) {
      console.error('Error al cargar campeonatos:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadEquipos = useCallback(async () => {
    if (!selectedCampeonatoId) return;
    
    try {
      setError(null);
      const response = await campeonatoService.getById(selectedCampeonatoId);
      const campeonato = response.data;
      const equiposData = campeonato.equipos || [];
      setEquipos(equiposData);
    } catch (err) {
      console.error('Error al cargar equipos:', err);
      setError('No se pudieron cargar los equipos');
    } finally {
      setRefreshing(false);
    }
  }, [selectedCampeonatoId]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadEquipos();
  }, [loadEquipos]);

  const handleEquipoPress = useCallback((equipoId: number) => {
    // TODO: Navegación a detalle deshabilitada temporalmente
    console.log('Equipo seleccionado:', equipoId);
  }, []);

  const renderEquipo = useCallback(({ item }: { item: EquipoWithCampeonato }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => handleEquipoPress(item.id)}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Equipo ${item.nombre}`}
      accessibilityHint="Presiona dos veces para ver detalles del equipo"
    >
      <View style={styles.cardContent}>
        <Text style={styles.nombre} numberOfLines={2}>
          {item.nombre || 'Sin nombre'}
        </Text>
        {item.campeonato_nombre && (
          <Text style={styles.campeonato} numberOfLines={1}>
            {item.campeonato_nombre}
          </Text>
        )}
      </View>
    </TouchableOpacity>
  ), [handleEquipoPress]);

  if (loading) {
    return (
      <View style={styles.container}>
        <Header title="Equipos" />
        <LoadingScreen message="Cargando..." />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header title="Equipos" />
      {campeonatos.length > 0 && (
        <View style={styles.filterContainer}>
          <FlatList
            horizontal
            data={campeonatos}
            keyExtractor={(item, index) => item?.id?.toString() || index.toString()}
            renderItem={({ item }) => (
              <View style={styles.chipContainer}>
                <Chip
                  label={item.nombre}
                  selected={selectedCampeonatoId === item.id}
                  onPress={() => setSelectedCampeonatoId(item.id)}
                />
              </View>
            )}
            contentContainerStyle={styles.filterContent}
            showsHorizontalScrollIndicator={false}
          />
        </View>
      )}
      {error ? (
        <ErrorScreen message={error} onRetry={loadEquipos} />
      ) : !selectedCampeonatoId ? (
        <EmptyState
          icon="groups"
          title="Selecciona un campeonato"
          message="Selecciona un campeonato para ver sus equipos"
        />
      ) : equipos.length === 0 ? (
        <EmptyState
          icon="groups"
          title="No hay equipos"
          message="No se encontraron equipos para este campeonato"
        />
      ) : (
        <FlatList
          data={equipos}
          renderItem={renderEquipo}
          keyExtractor={(item, index) => item?.id?.toString() || index.toString()}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  filterContainer: {
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: spacing.sm,
  },
  filterContent: {
    paddingHorizontal: spacing.md,
  },
  chipContainer: {
    marginRight: spacing.sm,
  },
  list: {
    padding: spacing.md,
  },
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
  cardContent: {
    flex: 1,
  },
  nombre: {
    fontSize: fontSize.xl,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  campeonato: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
});
