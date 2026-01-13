// src/screens/CampeonatosScreen.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { View, FlatList, StyleSheet, RefreshControl } from 'react-native';
import { campeonatoService } from '../services/api';
import { Campeonato } from '../types';
import { CampeonatoCard } from '../components/CampeonatoCard';
import { Header } from '../components/Header';
import { LoadingScreen } from '../components/LoadingScreen';
import { ErrorScreen } from '../components/ErrorScreen';
import { EmptyState } from '../components/EmptyState';
import colors from '../theme/colors';
import { spacing } from '../theme/spacing';

export const CampeonatosScreen = () => {
  const [campeonatos, setCampeonatos] = useState<Campeonato[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCampeonatos = useCallback(async () => {
    try {
      setError(null);
      const response = await campeonatoService.getPublicos();
      const data = response.data;
      setCampeonatos(data.campeonatos || data || []);
    } catch (err) {
      console.error('Error al cargar campeonatos:', err);
      setError('No se pudieron cargar los campeonatos');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadCampeonatos();
  }, [loadCampeonatos]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadCampeonatos();
  }, [loadCampeonatos]);

  const handleCampeonatoPress = useCallback((campeonatoId: number) => {
    // TODO: Navegación a detalle deshabilitada temporalmente
    console.log('Campeonato seleccionado:', campeonatoId);
  }, []);

  const renderCampeonato = useCallback(({ item }: { item: Campeonato }) => (
    <CampeonatoCard
      campeonato={item}
      onPress={() => handleCampeonatoPress(item.id)}
    />
  ), [handleCampeonatoPress]);

  if (loading) {
    return (
      <View style={styles.container}>
        <Header title="Campeonatos" />
        <LoadingScreen message="Cargando campeonatos..." />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Header title="Campeonatos" />
        <ErrorScreen message={error} onRetry={loadCampeonatos} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header title="Campeonatos" />
      {campeonatos.length === 0 ? (
        <EmptyState
          icon="emoji-events"
          title="No hay campeonatos"
          message="No se encontraron campeonatos disponibles"
        />
      ) : (
        <FlatList
          data={campeonatos}
          renderItem={renderCampeonato}
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
  list: {
    padding: spacing.md,
  },
});
