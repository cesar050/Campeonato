// src/screens/EquipoDetailScreen.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, FlatList, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { equipoService, jugadorService } from '../services/api';
import { Equipo, Jugador } from '../types';
import { Header } from '../components/Header';
import { LoadingScreen } from '../components/LoadingScreen';
import { ErrorScreen } from '../components/ErrorScreen';
import { EmptyState } from '../components/EmptyState';
import colors from '../theme/colors';
import { fontSize, spacing, borderRadius } from '../theme/spacing';

type NavigationProp = StackNavigationProp<RootStackParamList>;
type RouteProp = RouteProp<RootStackParamList, 'EquipoDetail'>;

export const EquipoDetailScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp>();
  const { equipoId } = route.params;
  
  const [equipo, setEquipo] = useState<Equipo | null>(null);
  const [jugadores, setJugadores] = useState<Jugador[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    try {
      setError(null);
      const [equipoResponse, jugadoresResponse] = await Promise.all([
        equipoService.getById(equipoId),
        jugadorService.getByEquipo(equipoId).catch(() => ({ data: [] })),
      ]);
      
      setEquipo(equipoResponse.data);
      setJugadores(jugadoresResponse.data.jugadores || jugadoresResponse.data || []);
    } catch (err) {
      console.error('Error al cargar datos:', err);
      setError('No se pudieron cargar los datos del equipo');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [equipoId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  const renderJugador = useCallback(({ item }: { item: Jugador }) => (
    <View style={styles.jugadorCard}>
      <View style={styles.jugadorInfo}>
        <Text style={styles.jugadorNombre}>
          {item.nombre} {item.apellido}
        </Text>
        {item.numero && (
          <Text style={styles.jugadorNumero}>#{item.numero}</Text>
        )}
        {item.posicion && (
          <Text style={styles.jugadorPosicion}>{item.posicion}</Text>
        )}
      </View>
    </View>
  ), []);

  if (loading) {
    return (
      <View style={styles.container}>
        <Header title="Detalle del Equipo" onBack={() => navigation.goBack()} />
        <LoadingScreen message="Cargando equipo..." />
      </View>
    );
  }

  if (error || !equipo) {
    return (
      <View style={styles.container}>
        <Header title="Detalle del Equipo" onBack={() => navigation.goBack()} />
        <ErrorScreen 
          message={error || 'Equipo no encontrado'} 
          onRetry={loadData} 
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header title="Detalle del Equipo" onBack={() => navigation.goBack()} />
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
        <View style={styles.equipoCard}>
          <Text style={styles.equipoNombre}>{equipo.nombre}</Text>
        </View>

        <View style={styles.jugadoresCard}>
          <Text style={styles.sectionTitle}>Jugadores</Text>
          {jugadores.length === 0 ? (
            <EmptyState
              icon="person"
              title="No hay jugadores"
              message="Este equipo no tiene jugadores registrados"
            />
          ) : (
            <FlatList
              data={jugadores}
              renderItem={renderJugador}
              keyExtractor={(item, index) => item?.id?.toString() || index.toString()}
              scrollEnabled={false}
            />
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
  equipoCard: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    elevation: 2,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    alignItems: 'center',
  },
  equipoNombre: {
    fontSize: fontSize.xxl,
    fontWeight: 'bold',
    color: colors.text,
    textAlign: 'center',
  },
  jugadoresCard: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    elevation: 2,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  sectionTitle: {
    fontSize: fontSize.xl,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  jugadorCard: {
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  jugadorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  jugadorNombre: {
    fontSize: fontSize.md,
    fontWeight: '500',
    color: colors.text,
    flex: 1,
  },
  jugadorNumero: {
    fontSize: fontSize.md,
    fontWeight: '600',
    color: colors.primary,
    marginLeft: spacing.sm,
  },
  jugadorPosicion: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginLeft: spacing.sm,
  },
});
