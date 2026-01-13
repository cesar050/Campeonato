// src/screens/PartidosScreen.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, Text } from 'react-native';
import { partidoService, campeonatoService } from '../services/api';
import { Partido, Campeonato } from '../types';
import { PartidoCard } from '../components/PartidoCard';
import { Chip } from '../components/Chip';
import { Header } from '../components/Header';
import { LoadingScreen } from '../components/LoadingScreen';
import { ErrorScreen } from '../components/ErrorScreen';
import { EmptyState } from '../components/EmptyState';
import colors from '../theme/colors';
import { spacing } from '../theme/spacing';

export const PartidosScreen = () => {
  const [partidos, setPartidos] = useState<Partido[]>([]);
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
      loadPartidos();
    } else {
      setPartidos([]);
    }
  }, [selectedCampeonatoId]);

  const loadCampeonatos = useCallback(async () => {
    try {
      const response = await campeonatoService.getPublicos();
      const data = response.data;
      const campeonatosList = data.campeonatos || data || [];
      setCampeonatos(campeonatosList);
      if (campeonatosList.length > 0) {
        setSelectedCampeonatoId(campeonatosList[0].id);
      }
    } catch (err) {
      console.error('Error al cargar campeonatos:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadPartidos = useCallback(async () => {
    if (!selectedCampeonatoId) return;
    
    try {
      setError(null);
      const response = await partidoService.getByCampeonato(selectedCampeonatoId);
      const data = response.data;
      setPartidos(data.partidos || data || []);
    } catch (err) {
      console.error('Error al cargar partidos:', err);
      setError('No se pudieron cargar los partidos');
    } finally {
      setRefreshing(false);
    }
  }, [selectedCampeonatoId]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadPartidos();
  }, [loadPartidos]);

  const handlePartidoPress = useCallback((partidoId: number) => {
    // TODO: Navegación a detalle deshabilitada temporalmente
    console.log('Partido seleccionado:', partidoId);
  }, []);

  const renderPartido = useCallback(({ item }: { item: Partido }) => (
    <PartidoCard
      partido={item}
      onPress={() => handlePartidoPress(item.id)}
    />
  ), [handlePartidoPress]);

  if (loading) {
    return (
      <View style={styles.container}>
        <Header title="Partidos" />
        <LoadingScreen message="Cargando..." />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header title="Partidos" />
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
        <ErrorScreen message={error} onRetry={loadPartidos} />
      ) : partidos.length === 0 ? (
        <EmptyState
          icon="sports-soccer"
          title="No hay partidos"
          message={
            selectedCampeonatoId
              ? 'No se encontraron partidos para este campeonato'
              : 'Selecciona un campeonato para ver los partidos'
          }
        />
      ) : (
        <FlatList
          data={partidos}
          renderItem={renderPartido}
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
});
