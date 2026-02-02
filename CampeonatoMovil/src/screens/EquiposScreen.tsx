import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  ScrollView,
} from 'react-native';
import axios from 'axios';
import { colors } from '../theme/colors';
import { API_BASE_URL } from '../utils/constants';

const API_URL = API_BASE_URL;

interface Equipo {
  id_equipo: number;
  nombre: string;
  logo_url?: string | null;
  estadio?: string;
  tipo_deporte?: string;
  total_jugadores?: number;
  lider?: {
    id_usuario: number;
    nombre: string;
    email: string;
  };
}

interface Campeonato {
  id_campeonato: number;
  nombre: string;
  estado: string;
  logo_url?: string | null;
  descripcion?: string;
  tipo_deporte?: string;
  total_equipos_inscritos?: number;
}

interface Props {
  onSelectEquipo?: (id: number) => void;
}

export const EquiposScreen: React.FC<Props> = ({ onSelectEquipo }) => {
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingCampeonatos, setLoadingCampeonatos] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCampeonato, setSelectedCampeonato] = useState<number | null>(null);
  const [campeonatos, setCampeonatos] = useState<Campeonato[]>([]);
  const [showCampeonatos, setShowCampeonatos] = useState(true);

  useEffect(() => {
    loadCampeonatos();
  }, []);

  useEffect(() => {
    if (selectedCampeonato) {
      loadEquipos();
    } else {
      setEquipos([]);
      setLoading(false);
    }
  }, [selectedCampeonato]);

  const loadCampeonatos = async () => {
    try {
      setLoadingCampeonatos(true);
      console.log('🔍 Cargando campeonatos desde:', `${API_URL}/campeonatos`);
      
      const response = await axios.get(`${API_URL}/campeonatos`, {
        timeout: 10000,
      });
      
      const data = response.data.campeonatos || response.data || [];
      const campeonatosFiltrados = data.filter((c: Campeonato) => 
        c.estado === 'en_curso' || c.estado === 'planificacion' || c.estado === 'finalizado'
      );
      
      console.log('✅ Campeonatos cargados:', campeonatosFiltrados.length);
      setCampeonatos(campeonatosFiltrados);
    } catch (error: any) {
      console.error('❌ Error cargando campeonatos:', error.message);
    } finally {
      setLoadingCampeonatos(false);
    }
  };

  const loadEquipos = async () => {
    if (!selectedCampeonato) return;
    
    try {
      setLoading(true);
      setRefreshing(true);
      console.log('🔍 Cargando equipos del campeonato:', selectedCampeonato);
      
      // Obtener equipos inscritos aprobados del campeonato
      const response = await axios.get(`${API_URL}/campeonatos/${selectedCampeonato}/inscripciones?estado=aprobado`, {
        timeout: 10000,
      });
      
      const data = response.data;
      const inscripciones = data.inscripciones || [];
      const equiposData = inscripciones.map((inscripcion: any) => {
        const equipo = inscripcion.equipo || {};
        return {
          id_equipo: equipo.id_equipo,
          nombre: equipo.nombre,
          logo_url: equipo.logo_url,
          estadio: equipo.estadio,
          tipo_deporte: equipo.tipo_deporte,
          total_jugadores: equipo.total_jugadores,
          lider: equipo.lider,
        };
      });
      
      console.log('✅ Equipos cargados:', equiposData.length);
      setEquipos(equiposData);
    } catch (error: any) {
      console.error('❌ Error cargando equipos:', error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    if (selectedCampeonato) {
    loadEquipos();
    } else {
      loadCampeonatos();
    }
  };

  const handleCampeonatoSelect = (campeonato: Campeonato) => {
    setSelectedCampeonato(campeonato.id_campeonato);
    setShowCampeonatos(false);
  };

  const handleBackToCampeonatos = () => {
    setSelectedCampeonato(null);
    setShowCampeonatos(true);
    setEquipos([]);
  };

  const renderCampeonato = (campeonato: Campeonato) => (
    <TouchableOpacity
      key={campeonato.id_campeonato}
      style={styles.campeonatoCard}
      onPress={() => handleCampeonatoSelect(campeonato)}
    >
      <View style={styles.campeonatoCardContent}>
        <View style={styles.campeonatoLogoContainer}>
          {campeonato.logo_url ? (
            <Image
              source={{ uri: campeonato.logo_url.includes('localhost') ? campeonato.logo_url.replace('http://localhost:5000', API_URL) : campeonato.logo_url }}
              style={styles.campeonatoLogo}
              onError={(error) => console.warn('Error cargando logo campeonato:', campeonato.logo_url, error)}
            />
          ) : (
            <View style={styles.campeonatoLogoPlaceholder}>
              <Text style={styles.campeonatoLogoText}>{campeonato.nombre.charAt(0).toUpperCase()}</Text>
            </View>
          )}
        </View>
        <View style={styles.campeonatoInfo}>
          <Text style={styles.campeonatoNombre} numberOfLines={2}>{campeonato.nombre}</Text>
          <Text style={styles.campeonatoEstado}>
            {campeonato.estado === 'en_curso' ? 'En Curso' : 
             campeonato.estado === 'planificacion' ? 'Planificación' : 
             campeonato.estado === 'finalizado' ? 'Finalizado' : campeonato.estado}
          </Text>
          <View style={styles.campeonatoStats}>
            <View style={styles.campeonatoStatItem}>
              <Text style={styles.campeonatoStatValue}>👥 {campeonato.total_equipos_inscritos || 0}</Text>
              <Text style={styles.campeonatoStatLabel}>equipos</Text>
            </View>
          </View>
        </View>
        <Text style={styles.campeonatoArrow}>→</Text>
      </View>
    </TouchableOpacity>
  );

  const renderEquipo = (equipo: Equipo) => (
    <TouchableOpacity
      key={equipo.id_equipo}
      style={styles.equipoCard}
      onPress={() => onSelectEquipo && onSelectEquipo(equipo.id_equipo)}
    >
      <View style={styles.equipoCardContent}>
        <View style={styles.equipoLogoContainer}>
          {equipo.logo_url ? (
            <Image
              source={{ uri: equipo.logo_url.includes('localhost') ? equipo.logo_url.replace('http://localhost:5000', API_URL) : equipo.logo_url }}
              style={styles.equipoLogo}
              onError={(error) => console.warn('Error cargando logo equipo:', equipo.logo_url, error)}
            />
          ) : (
            <View style={styles.equipoLogoPlaceholder}>
              <Text style={styles.equipoLogoText}>{equipo.nombre.charAt(0).toUpperCase()}</Text>
            </View>
          )}
        </View>
        <View style={styles.equipoInfo}>
          <Text style={styles.equipoNombre} numberOfLines={2}>{equipo.nombre}</Text>
          {equipo.estadio && (
            <Text style={styles.equipoEstadio} numberOfLines={1}>🏟️ {equipo.estadio}</Text>
          )}
          {equipo.total_jugadores !== undefined && (
            <Text style={styles.equipoJugadores}>👥 {equipo.total_jugadores} jugadores</Text>
          )}
          {equipo.lider && (
            <Text style={styles.equipoLider}>👤 {equipo.lider.nombre}</Text>
          )}
        </View>
        <Text style={styles.equipoArrow}>→</Text>
      </View>
    </TouchableOpacity>
  );

  if (loadingCampeonatos) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Equipos</Text>
        </View>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Cargando campeonatos...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        {!showCampeonatos && (
          <TouchableOpacity onPress={handleBackToCampeonatos} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Volver</Text>
          </TouchableOpacity>
            )}
        <Text style={styles.headerTitle}>
          {showCampeonatos ? 'Equipos' : 'Equipos del Campeonato'}
        </Text>
        </View>

      {showCampeonatos ? (
        <FlatList
          data={campeonatos}
          renderItem={({ item }) => renderCampeonato(item)}
          keyExtractor={(item) => item.id_campeonato.toString()}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyIcon}>⚽</Text>
              <Text style={styles.emptyText}>No hay campeonatos disponibles</Text>
            </View>
          }
        />
      ) : (
        <>
          {loading ? (
            <View style={styles.centerContent}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Cargando equipos...</Text>
            </View>
          ) : (
            <FlatList
              data={equipos}
              renderItem={({ item }) => renderEquipo(item)}
              keyExtractor={(item) => item.id_equipo.toString()}
              contentContainerStyle={styles.list}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  colors={[colors.primary]}
                  tintColor={colors.primary}
                />
              }
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Text style={styles.emptyIcon}>👥</Text>
                  <Text style={styles.emptyText}>No hay equipos inscritos en este campeonato</Text>
                </View>
              }
            />
          )}
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    marginRight: 10,
  },
  backButtonText: {
    fontSize: 16,
    color: colors.primary,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212121',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#757575',
  },
  list: {
    padding: 16,
  },
  campeonatoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  campeonatoCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  campeonatoLogoContainer: {
    width: 60,
    height: 60,
    marginRight: 12,
  },
  campeonatoLogo: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  campeonatoLogoPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  campeonatoLogoText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  campeonatoInfo: {
    flex: 1,
  },
  campeonatoNombre: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212121',
    marginBottom: 4,
  },
  campeonatoEstado: {
    fontSize: 12,
    color: '#757575',
    marginBottom: 4,
  },
  campeonatoStats: {
    flexDirection: 'row',
    marginTop: 4,
  },
  campeonatoStatItem: {
    marginRight: 16,
  },
  campeonatoStatValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212121',
  },
  campeonatoStatLabel: {
    fontSize: 11,
    color: '#757575',
  },
  campeonatoArrow: {
    fontSize: 20,
    color: '#757575',
  },
  equipoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  equipoCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  equipoLogoContainer: {
    width: 60,
    height: 60,
    marginRight: 12,
  },
  equipoLogo: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  equipoLogoPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  equipoLogoText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  equipoInfo: {
    flex: 1,
  },
  equipoNombre: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212121',
    marginBottom: 4,
  },
  equipoEstadio: {
    fontSize: 12,
    color: '#757575',
    marginBottom: 2,
  },
  equipoJugadores: {
    fontSize: 12,
    color: '#757575',
    marginBottom: 2,
  },
  equipoLider: {
    fontSize: 12,
    color: '#757575',
  },
  equipoArrow: {
    fontSize: 20,
    color: '#757575',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#757575',
    textAlign: 'center',
  },
});
