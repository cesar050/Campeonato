// src/screens/FavoritosScreen.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { View, FlatList, StyleSheet, RefreshControl, TouchableOpacity, Text } from 'react-native';
import { favoritesService } from '../services/favoritesService';
import { Campeonato, Equipo } from '../types';
import { CampeonatoCard } from '../components/CampeonatoCard';
import { Header } from '../components/Header';
import { EmptyState } from '../components/EmptyState';
import { Chip } from '../components/Chip';
import colors from '../theme/colors';
import { fontSize, spacing, borderRadius, touchTargetSize } from '../theme/spacing';

type FavoriteTab = 'campeonatos' | 'equipos';

export const FavoritosScreen = () => {
  const [campeonatos, setCampeonatos] = useState<Campeonato[]>([]);
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [activeTab, setActiveTab] = useState<FavoriteTab>('campeonatos');
  const [refreshing, setRefreshing] = useState(false);

  const loadFavorites = useCallback(async () => {
    try {
      const favorites = await favoritesService.getFavorites();
      setCampeonatos(favorites.campeonatos);
      setEquipos(favorites.equipos);
    } catch (error) {
      console.error('Error al cargar favoritos:', error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadFavorites();
  }, [loadFavorites]);

  const handleCampeonatoPress = useCallback((campeonatoId: number) => {
    // TODO: Navegación a detalle deshabilitada temporalmente
    console.log('Campeonato seleccionado:', campeonatoId);
  }, []);

  const handleEquipoPress = useCallback((equipoId: number) => {
    // TODO: Navegación a detalle deshabilitada temporalmente
    console.log('Equipo seleccionado:', equipoId);
  }, []);

  const handleRemoveCampeonato = useCallback(async (campeonatoId: number) => {
    await favoritesService.removeCampeonato(campeonatoId);
    loadFavorites();
  }, [loadFavorites]);

  const handleRemoveEquipo = useCallback(async (equipoId: number) => {
    await favoritesService.removeEquipo(equipoId);
    loadFavorites();
  }, [loadFavorites]);

  const renderCampeonato = useCallback(({ item }: { item: Campeonato }) => (
    <CampeonatoCard
      campeonato={item}
      onPress={() => handleCampeonatoPress(item.id)}
    />
  ), [handleCampeonatoPress]);

  const renderEquipo = useCallback(({ item }: { item: Equipo }) => (
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
      </View>
    </TouchableOpacity>
  ), [handleEquipoPress]);

  return (
    <View style={styles.container}>
      <Header title="Favoritos" />
      <View style={styles.tabContainer}>
        <Chip
          label={`Campeonatos (${campeonatos.length})`}
          selected={activeTab === 'campeonatos'}
          onPress={() => setActiveTab('campeonatos')}
        />
        <View style={styles.tabSpacing} />
        <Chip
          label={`Equipos (${equipos.length})`}
          selected={activeTab === 'equipos'}
          onPress={() => setActiveTab('equipos')}
        />
      </View>
      {activeTab === 'campeonatos' ? (
        campeonatos.length === 0 ? (
          <EmptyState
            icon="emoji-events"
            title="No hay campeonatos favoritos"
            message="No has agregado ningún campeonato a favoritos todavía"
          />
        ) : (
          <FlatList<Campeonato>
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
        )
      ) : (
        equipos.length === 0 ? (
          <EmptyState
            icon="groups"
            title="No hay equipos favoritos"
            message="No has agregado ningún equipo a favoritos todavía"
          />
        ) : (
          <FlatList<Equipo>
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
        )
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  tabContainer: {
    flexDirection: 'row',
    padding: spacing.md,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabSpacing: {
    width: spacing.sm,
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
  },
});
