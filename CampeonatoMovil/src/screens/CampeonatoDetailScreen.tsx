// src/screens/CampeonatoDetailScreen.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '../navigation/AppNavigator';
import { campeonatoService, estadisticasService } from '../services/api';
import { Campeonato, TablaPosicion, Goleador, Tarjeta } from '../types';
import { Header } from '../components/Header';
import { LoadingScreen } from '../components/LoadingScreen';
import { ErrorScreen } from '../components/ErrorScreen';
import { EmptyState } from '../components/EmptyState';
import { Badge } from '../components/Badge';
import { TabView } from '../components/TabView';
import { StatsTable } from '../components/StatsTable';
import colors from '../theme/colors';
import { fontSize, spacing, borderRadius } from '../theme/spacing';

type NavigationProp = StackNavigationProp<RootStackParamList>;
type RouteProp = RouteProp<RootStackParamList, 'CampeonatoDetail'>;

type TabKey = 'info' | 'tabla' | 'goleadores' | 'tarjetas';

export const CampeonatoDetailScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<RouteProp>();
  const { campeonatoId } = route.params;
  
  const [campeonato, setCampeonato] = useState<Campeonato | null>(null);
  const [tablaPosiciones, setTablaPosiciones] = useState<TablaPosicion[]>([]);
  const [goleadores, setGoleadores] = useState<Goleador[]>([]);
  const [tarjetas, setTarjetas] = useState<Tarjeta[]>([]);
  const [activeTab, setActiveTab] = useState<TabKey>('info');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCampeonato = useCallback(async () => {
    try {
      setError(null);
      const response = await campeonatoService.getById(campeonatoId);
      setCampeonato(response.data);
    } catch (err) {
      console.error('Error al cargar campeonato:', err);
      setError('No se pudo cargar el campeonato');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [campeonatoId]);

  const loadTablaPosiciones = useCallback(async () => {
    try {
      const response = await estadisticasService.getTablaPosiciones(campeonatoId);
      const data = response.data;
      setTablaPosiciones(data.tabla || data || []);
    } catch (err) {
      console.error('Error al cargar tabla de posiciones:', err);
      setTablaPosiciones([]);
    }
  }, [campeonatoId]);

  const loadGoleadores = useCallback(async () => {
    try {
      const response = await estadisticasService.getGoleadores(campeonatoId);
      const data = response.data;
      setGoleadores(data.goleadores || data || []);
    } catch (err) {
      console.error('Error al cargar goleadores:', err);
      setGoleadores([]);
    }
  }, [campeonatoId]);

  const loadTarjetas = useCallback(async () => {
    try {
      const response = await estadisticasService.getTarjetas(campeonatoId);
      const data = response.data;
      setTarjetas(data.tarjetas || data || []);
    } catch (err) {
      console.error('Error al cargar tarjetas:', err);
      setTarjetas([]);
    }
  }, [campeonatoId]);

  const loadAllData = useCallback(async () => {
    await Promise.all([
      loadCampeonato(),
      loadTablaPosiciones(),
      loadGoleadores(),
      loadTarjetas(),
    ]);
  }, [loadCampeonato, loadTablaPosiciones, loadGoleadores, loadTarjetas]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  useEffect(() => {
    if (activeTab === 'tabla' && tablaPosiciones.length === 0) {
      loadTablaPosiciones();
    } else if (activeTab === 'goleadores' && goleadores.length === 0) {
      loadGoleadores();
    } else if (activeTab === 'tarjetas' && tarjetas.length === 0) {
      loadTarjetas();
    }
  }, [activeTab]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadAllData();
  }, [loadAllData]);

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
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.container}>
        <Header title="Detalle del Campeonato" onBack={() => navigation.goBack()} />
        <LoadingScreen message="Cargando campeonato..." />
      </View>
    );
  }

  if (error || !campeonato) {
    return (
      <View style={styles.container}>
        <Header title="Detalle del Campeonato" onBack={() => navigation.goBack()} />
        <ErrorScreen 
          message={error || 'Campeonato no encontrado'} 
          onRetry={loadCampeonato} 
        />
      </View>
    );
  }

  const tabs = [
    { key: 'info', label: 'Información' },
    { key: 'tabla', label: 'Tabla' },
    { key: 'goleadores', label: 'Goleadores' },
    { key: 'tarjetas', label: 'Tarjetas' },
  ];

  const renderInfoTab = () => (
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
      <View style={styles.infoCard}>
        <View style={styles.headerRow}>
          <Text style={styles.nombre}>{campeonato.nombre}</Text>
          <Badge
            label={getEstadoLabel(campeonato.estado)}
            backgroundColor={getEstadoColor(campeonato.estado)}
          />
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Tipo de Deporte:</Text>
          <Text style={styles.infoValue}>
            {campeonato.deporte_tipo === 'futbol' ? 'Fútbol' : 'Indoor'}
          </Text>
        </View>

        {campeonato.tipo_competicion && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Tipo de Competición:</Text>
            <Text style={styles.infoValue}>{campeonato.tipo_competicion}</Text>
          </View>
        )}

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Fecha de Inicio:</Text>
          <Text style={styles.infoValue}>{formatDate(campeonato.fecha_inicio)}</Text>
        </View>

        {campeonato.fecha_fin && (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Fecha de Fin:</Text>
            <Text style={styles.infoValue}>{formatDate(campeonato.fecha_fin)}</Text>
          </View>
        )}

        {campeonato.descripcion && (
          <View style={styles.descriptionRow}>
            <Text style={styles.infoLabel}>Descripción:</Text>
            <Text style={styles.description}>{campeonato.descripcion}</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );

  const renderTablaTab = () => {
    const tablaData = tablaPosiciones.map((item, index) => ({
      posicion: index + 1,
      equipo: item.equipo.nombre,
      puntos: item.puntos,
      partidos: item.partidos_jugados,
      ganados: item.partidos_ganados,
      empatados: item.partidos_empatados,
      perdidos: item.partidos_perdidos,
      golesFavor: item.goles_favor,
      golesContra: item.goles_contra,
      diferencia: item.diferencia_goles,
    }));

    const columns = [
      { key: 'posicion', label: 'Pos', width: 50, align: 'center' as const },
      { key: 'equipo', label: 'Equipo', width: 150, align: 'left' as const },
      { key: 'puntos', label: 'Pts', width: 50, align: 'center' as const },
      { key: 'partidos', label: 'PJ', width: 50, align: 'center' as const },
      { key: 'ganados', label: 'G', width: 50, align: 'center' as const },
      { key: 'empatados', label: 'E', width: 50, align: 'center' as const },
      { key: 'perdidos', label: 'P', width: 50, align: 'center' as const },
      { key: 'golesFavor', label: 'GF', width: 50, align: 'center' as const },
      { key: 'golesContra', label: 'GC', width: 50, align: 'center' as const },
      { key: 'diferencia', label: 'Dif', width: 50, align: 'center' as const },
    ];

    return (
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {tablaPosiciones.length === 0 ? (
          <EmptyState
            icon="leaderboard"
            title="No hay tabla de posiciones"
            message="La tabla de posiciones no está disponible"
          />
        ) : (
          <StatsTable columns={columns} data={tablaData} />
        )}
      </ScrollView>
    );
  };

  const renderGoleadoresTab = () => {
    const goleadoresData = goleadores.map((item) => ({
      jugador: `${item.jugador.nombre} ${item.jugador.apellido}`,
      equipo: item.jugador.equipo?.nombre || '-',
      goles: item.goles,
      partidos: item.partidos_jugados,
    }));

    const columns = [
      { key: 'jugador', label: 'Jugador', width: 150, align: 'left' as const },
      { key: 'equipo', label: 'Equipo', width: 120, align: 'left' as const },
      { key: 'goles', label: 'Goles', width: 70, align: 'center' as const },
      { key: 'partidos', label: 'PJ', width: 60, align: 'center' as const },
    ];

    return (
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {goleadores.length === 0 ? (
          <EmptyState
            icon="sports-score"
            title="No hay goleadores"
            message="No hay información de goleadores disponible"
          />
        ) : (
          <StatsTable columns={columns} data={goleadoresData} />
        )}
      </ScrollView>
    );
  };

  const renderTarjetasTab = () => {
    const tarjetasData = tarjetas.map((item) => ({
      jugador: `${item.jugador.nombre} ${item.jugador.apellido}`,
      equipo: item.jugador.equipo?.nombre || '-',
      amarillas: item.amarillas,
      rojas: item.rojas,
      partidos: item.partidos_jugados,
    }));

    const columns = [
      { key: 'jugador', label: 'Jugador', width: 150, align: 'left' as const },
      { key: 'equipo', label: 'Equipo', width: 120, align: 'left' as const },
      { key: 'amarillas', label: 'Amarillas', width: 80, align: 'center' as const },
      { key: 'rojas', label: 'Rojas', width: 70, align: 'center' as const },
      { key: 'partidos', label: 'PJ', width: 60, align: 'center' as const },
    ];

    return (
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {tarjetas.length === 0 ? (
          <EmptyState
            icon="warning"
            title="No hay tarjetas"
            message="No hay información de tarjetas disponible"
          />
        ) : (
          <StatsTable columns={columns} data={tarjetasData} />
        )}
      </ScrollView>
    );
  };

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'info':
        return renderInfoTab();
      case 'tabla':
        return renderTablaTab();
      case 'goleadores':
        return renderGoleadoresTab();
      case 'tarjetas':
        return renderTarjetasTab();
      default:
        return renderInfoTab();
    }
  };

  return (
    <View style={styles.container}>
      <Header title="Detalle del Campeonato" onBack={() => navigation.goBack()} />
      <TabView
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={(tabKey) => setActiveTab(tabKey as TabKey)}
      >
        {renderActiveTab()}
      </TabView>
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  nombre: {
    flex: 1,
    fontSize: fontSize.xxl,
    fontWeight: 'bold',
    color: colors.text,
    marginRight: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  descriptionRow: {
    paddingVertical: spacing.sm,
  },
  infoLabel: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    fontWeight: '500',
    flex: 1,
  },
  infoValue: {
    fontSize: fontSize.md,
    color: colors.text,
    flex: 1,
    textAlign: 'right',
    marginLeft: spacing.md,
  },
  description: {
    fontSize: fontSize.md,
    color: colors.text,
    marginTop: spacing.xs,
    lineHeight: 24,
  },
});
