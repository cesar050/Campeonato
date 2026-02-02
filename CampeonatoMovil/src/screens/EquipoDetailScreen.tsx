import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  FlatList,
} from 'react-native';
import axios from 'axios';
import { colors } from '../theme/colors';
import { API_BASE_URL } from '../utils/constants';

const API_URL = API_BASE_URL;

interface EquipoDetail {
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
  campeonato?: {
    id_campeonato: number;
    nombre: string;
  };
}

interface Posicion {
  posicion: number;
  id_equipo: number;
  equipo: string;
  nombre?: string;
  logo_url?: string;
  partidos_jugados: number;
  ganados: number;
  empatados: number;
  perdidos: number;
  goles_favor: number;
  goles_contra: number;
  diferencia_goles: number;
  puntos: number;
}

interface Partido {
  id_partido: number;
  id_equipo_local?: number;
  id_equipo_visitante?: number;
  equipo_local: string;
  equipo_visitante: string;
  goles_local: number | null;
  goles_visitante: number | null;
  fecha_partido?: string;
  fecha_hora?: string;
  estado: string;
  lugar: string;
  jornada?: number;
  campeonato?: {
    id_campeonato: number;
    nombre: string;
  };
}

interface Jugador {
  id_jugador: number;
  nombre: string;
  apellido: string;
  dorsal?: number;
  posicion?: string;
  foto_url?: string | null;
  activo: boolean;
}

interface EquipoLogo {
  [key: number]: string | null;
}

type TabType = 'tabla' | 'partidos' | 'jugadores';

interface Props {
  equipoId: number;
  onBack: () => void;
}

export const EquipoDetailScreen: React.FC<Props> = ({ equipoId, onBack }) => {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('tabla');
  const [equipo, setEquipo] = useState<EquipoDetail | null>(null);
  const [tabla, setTabla] = useState<Posicion[]>([]);
  const [partidos, setPartidos] = useState<Partido[]>([]);
  const [jugadores, setJugadores] = useState<Jugador[]>([]);
  const [idCampeonato, setIdCampeonato] = useState<number | null>(null);
  const [posicionEquipo, setPosicionEquipo] = useState<number | null>(null);
  const [equiposLogos, setEquiposLogos] = useState<EquipoLogo>({});

  useEffect(() => {
    loadData();
  }, [equipoId]);

  // Cargar logos cuando cambien los datos
  useEffect(() => {
    if (tabla.length > 0 || partidos.length > 0) {
      loadEquiposLogos();
    }
  }, [tabla, partidos]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Cargar equipo
      const equipoRes = await axios.get(`${API_URL}/equipos/${equipoId}`);
      const equipoData = equipoRes.data.equipo || equipoRes.data;
      setEquipo(equipoData);

      // Obtener campeonato del equipo (necesario para tabla y partidos)
      // Buscar en los campeonatos donde el equipo está inscrito
      let campeonatoEncontrado: number | null = null;
      try {
        const campeonatosRes = await axios.get(`${API_URL}/campeonatos`);
        const campeonatos = campeonatosRes.data.campeonatos || campeonatosRes.data || [];
        
        for (const campeonato of campeonatos) {
          try {
            const inscripcionesRes = await axios.get(`${API_URL}/campeonatos/${campeonato.id_campeonato}/inscripciones?estado=aprobado`);
            const inscripciones = inscripcionesRes.data.inscripciones || [];
            const equipoInscrito = inscripciones.find((ins: any) => 
              ins.equipo && ins.equipo.id_equipo === equipoId
            );
            
            if (equipoInscrito) {
              campeonatoEncontrado = campeonato.id_campeonato;
              setIdCampeonato(campeonato.id_campeonato);
              break;
            }
          } catch (err) {
            // Continuar con el siguiente campeonato
          }
        }
      } catch (err) {
        console.warn('No se pudo encontrar campeonato del equipo');
      }

      // Cargar datos en paralelo
      await Promise.all([
        campeonatoEncontrado ? loadTabla(campeonatoEncontrado) : Promise.resolve(),
        loadPartidos(),
        loadJugadores(),
      ]);
    } catch (error: any) {
      console.error('❌ Error cargando datos del equipo:', error.message);
    } finally {
      setLoading(false);
    }
  };

  const loadTabla = async (campeonatoId: number) => {
    try {
      const response = await axios.get(`${API_URL}/partidos/campeonatos/${campeonatoId}/tabla-posiciones`);
      const data = response.data;
      
      // La respuesta puede venir en diferentes formatos
      let tablaData: Posicion[] = [];
      if (Array.isArray(data)) {
        tablaData = data;
      } else if (data.tabla && Array.isArray(data.tabla)) {
        tablaData = data.tabla;
      } else if (data.tabla_posiciones && Array.isArray(data.tabla_posiciones)) {
        tablaData = data.tabla_posiciones;
    }

      // Ordenar por posición
      tablaData.sort((a, b) => a.posicion - b.posicion);
      setTabla(tablaData);

      // Encontrar posición del equipo
      const posicion = tablaData.findIndex(p => p.id_equipo === equipoId);
      if (posicion !== -1) {
        setPosicionEquipo(posicion + 1);
      }
    } catch (error: any) {
      console.error('❌ Error cargando tabla:', error.message);
    }
  };

  const loadPartidos = async () => {
    try {
      console.log('🔍 Cargando partidos del equipo:', equipoId);
      // Cargar partidos donde el equipo participa
      const response = await axios.get(`${API_URL}/partidos?id_equipo=${equipoId}`, {
        timeout: 10000,
      });
      const data = response.data;
      
      console.log('📦 Respuesta completa de partidos:', JSON.stringify(data, null, 2));
      
      // Validar que partidosData sea un array
      // El endpoint devuelve: { data: { partidos: [...] }, pagination: {...} }
      let partidosData: Partido[] = [];
      if (Array.isArray(data)) {
        partidosData = data;
      } else if (data.data && data.data.partidos && Array.isArray(data.data.partidos)) {
        partidosData = data.data.partidos;
      } else if (data.partidos && Array.isArray(data.partidos)) {
        partidosData = data.partidos;
      } else if (Array.isArray(data.data)) {
        partidosData = data.data;
      }
      
      console.log('✅ Partidos extraídos (total):', partidosData.length);
      console.log('📋 Estados de partidos:', partidosData.map((p: Partido) => p?.estado));
      
      // Filtrar solo partidos programados o próximos (no finalizados)
      const proximos = partidosData
        .filter((p: Partido) => {
          if (!p) return false;
          const estado = p.estado?.toLowerCase() || '';
          // Incluir programados, pendientes, y también en_juego si queremos mostrar partidos en vivo
          return estado === 'programado' || estado === 'pendiente' || estado === 'en_juego';
        })
        .sort((a: Partido, b: Partido) => {
          const fechaA = new Date(a.fecha_partido || a.fecha_hora || '').getTime();
          const fechaB = new Date(b.fecha_partido || b.fecha_hora || '').getTime();
          // Ordenar ascendente (próximos primero)
          return fechaA - fechaB;
        });
      
      console.log('✅ Partidos próximos filtrados:', proximos.length);
      setPartidos(proximos);
    } catch (error: any) {
      console.error('❌ Error cargando partidos:', error.message);
      if (error.response) {
        console.error('❌ Respuesta del error:', error.response.data);
      }
      setPartidos([]); // Asegurar que se establezca un array vacío en caso de error
    }
  };

  const loadEquiposLogos = async () => {
    try {
      const equiposIds = new Set<number>();
      
      // Agregar IDs de equipos de la tabla
      tabla.forEach(pos => {
        if (pos.id_equipo) equiposIds.add(pos.id_equipo);
      });
      
      // Agregar IDs de equipos de los partidos
      partidos.forEach(partido => {
        if (partido.id_equipo_local) equiposIds.add(partido.id_equipo_local);
        if (partido.id_equipo_visitante) equiposIds.add(partido.id_equipo_visitante);
      });

      // Cargar logos de todos los equipos
      const logosPromises = Array.from(equiposIds).map(async (idEquipo) => {
        try {
          const response = await axios.get(`${API_URL}/equipos/${idEquipo}`, { timeout: 3000 });
          const equipoData = response.data.equipo || response.data;
          return { idEquipo, logo: equipoData.logo_url || null };
        } catch (err) {
          return { idEquipo, logo: null };
        }
      });

      const logosResults = await Promise.all(logosPromises);
      const logosMap: EquipoLogo = {};
      logosResults.forEach(({ idEquipo, logo }) => {
        logosMap[idEquipo] = logo;
      });

      setEquiposLogos(logosMap);
    } catch (error: any) {
      console.error('❌ Error cargando logos:', error.message);
    }
  };

  const getLogoEquipo = (idEquipo?: number): string | null => {
    if (!idEquipo) return null;
    return equiposLogos[idEquipo] || null;
  };

  const loadJugadores = async () => {
    try {
      const response = await axios.get(`${API_URL}/jugadores/equipo/${equipoId}`);
      const data = response.data;
      const jugadoresData = data.jugadores || data || [];
      
      // Filtrar solo jugadores activos y ordenar por dorsal
      const jugadoresActivos = jugadoresData
        .filter((j: Jugador) => j.activo !== false)
        .sort((a: Jugador, b: Jugador) => {
          const dorsalA = a.dorsal || 999;
          const dorsalB = b.dorsal || 999;
          return dorsalA - dorsalB;
        });
      
      setJugadores(jugadoresActivos);
    } catch (error: any) {
      console.error('❌ Error cargando jugadores:', error.message);
    }
  };

  const renderTabButton = (tab: TabType, label: string) => (
    <TouchableOpacity
      style={[styles.tabButton, activeTab === tab && styles.tabButtonActive]}
      onPress={() => setActiveTab(tab)}
    >
      <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderTabla = () => {
    if (!idCampeonato) {
      return (
        <View style={styles.tabContent}>
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📊</Text>
            <Text style={styles.emptyText}>No hay tabla de posiciones disponible</Text>
            <Text style={styles.emptySubtext}>El equipo no está inscrito en ningún campeonato activo</Text>
          </View>
        </View>
      );
    }

    if (tabla.length === 0) {
      return (
        <View style={styles.tabContent}>
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>📊</Text>
            <Text style={styles.emptyText}>No hay datos de tabla de posiciones</Text>
          </View>
        </View>
      );
    }

    return (
      <ScrollView style={styles.tabContent}>
        <View style={styles.tablaContainer}>
          <View style={styles.tablaHeader}>
            <Text style={styles.tablaHeaderPos}>#</Text>
            <Text style={styles.tablaHeaderEquipo}>Equipo</Text>
            <Text style={styles.tablaHeaderPJ}>PJ</Text>
            <Text style={styles.tablaHeaderG}>G</Text>
            <Text style={styles.tablaHeaderE}>E</Text>
            <Text style={styles.tablaHeaderP}>P</Text>
            <Text style={styles.tablaHeaderGF}>GF</Text>
            <Text style={styles.tablaHeaderGC}>GC</Text>
            <Text style={styles.tablaHeaderDG}>DG</Text>
            <Text style={styles.tablaHeaderPts}>Pts</Text>
          </View>
          {tabla.map((pos, index) => {
            const isEquipoActual = pos.id_equipo === equipoId;
            return (
              <View
                key={pos.id_equipo}
                style={[
                  styles.tablaRow,
                  isEquipoActual && styles.tablaRowHighlighted,
                ]}
              >
                <Text style={[styles.tablaPos, isEquipoActual && styles.tablaPosHighlighted]}>
                  {pos.posicion || index + 1}
                </Text>
                <View style={styles.tablaEquipo}>
                  {getLogoEquipo(pos.id_equipo) ? (
                    <Image
                      source={{ uri: getLogoEquipo(pos.id_equipo)!.includes('localhost') ? getLogoEquipo(pos.id_equipo)!.replace('http://localhost:5000', API_URL) : getLogoEquipo(pos.id_equipo)! }}
                      style={styles.tablaLogo}
                      onError={() => console.warn('Error cargando logo en tabla')}
                    />
                  ) : pos.logo_url ? (
                    <Image
                      source={{ uri: pos.logo_url.includes('localhost') ? pos.logo_url.replace('http://localhost:5000', API_URL) : pos.logo_url }}
                      style={styles.tablaLogo}
                      onError={() => console.warn('Error cargando logo_url en tabla')}
                    />
                  ) : (
                    <View style={styles.tablaLogoPlaceholder}>
                      <Text style={styles.tablaLogoText}>
                        {(pos.equipo || pos.nombre || '').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <Text style={[styles.tablaEquipoNombre, isEquipoActual && styles.tablaEquipoNombreHighlighted]} numberOfLines={1}>
                    {pos.equipo || pos.nombre || 'Equipo'}
                  </Text>
                </View>
                <Text style={styles.tablaCell}>{pos.partidos_jugados}</Text>
                <Text style={styles.tablaCell}>{pos.ganados}</Text>
                <Text style={styles.tablaCell}>{pos.empatados}</Text>
                <Text style={styles.tablaCell}>{pos.perdidos}</Text>
                <Text style={styles.tablaCell}>{pos.goles_favor}</Text>
                <Text style={styles.tablaCell}>{pos.goles_contra}</Text>
                <Text style={styles.tablaCell}>{pos.diferencia_goles}</Text>
                <Text style={[styles.tablaPts, isEquipoActual && styles.tablaPtsHighlighted]}>
                  {pos.puntos}
                </Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
    );
  };

  const renderPartidos = () => {
    if (partidos.length === 0) {
      return (
        <View style={styles.tabContent}>
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>⚽</Text>
            <Text style={styles.emptyText}>No hay próximos partidos programados</Text>
          </View>
        </View>
      );
    }

    return (
      <ScrollView style={styles.tabContent}>
        {partidos.map((partido) => {
          const isLocal = partido.id_equipo_local === equipoId;
          const rival = isLocal ? partido.equipo_visitante : partido.equipo_local;
          
          return (
            <View key={partido.id_partido} style={styles.partidoCard}>
              <View style={styles.partidoHeader}>
                <Text style={styles.partidoFecha}>
                  {partido.fecha_partido || partido.fecha_hora || 'Fecha por definir'}
                </Text>
                {partido.jornada && (
                  <Text style={styles.partidoJornada}>Jornada {partido.jornada}</Text>
                )}
              </View>
              <View style={styles.partidoBody}>
                <View style={styles.partidoEquipos}>
                  <View style={styles.partidoEquipoContainer}>
                    {getLogoEquipo(equipoId) ? (
                      <Image
                        source={{ uri: getLogoEquipo(equipoId)!.includes('localhost') ? getLogoEquipo(equipoId)!.replace('http://localhost:5000', API_URL) : getLogoEquipo(equipoId)! }}
                        style={styles.partidoEquipoLogo}
                        onError={() => console.warn('Error cargando logo equipo local')}
                      />
                    ) : (
                      <View style={styles.partidoEquipoLogoPlaceholder}>
                        <Text style={styles.partidoEquipoLogoText}>
                          {equipo?.nombre.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <Text style={styles.partidoEquipoNombre} numberOfLines={1}>
                      {equipo?.nombre}
                    </Text>
                  </View>
                  <Text style={styles.partidoVs}>vs</Text>
                  <View style={styles.partidoEquipoContainer}>
                    {getLogoEquipo(isLocal ? partido.id_equipo_visitante : partido.id_equipo_local) ? (
                      <Image
                        source={{ uri: getLogoEquipo(isLocal ? partido.id_equipo_visitante : partido.id_equipo_local)!.includes('localhost') ? getLogoEquipo(isLocal ? partido.id_equipo_visitante : partido.id_equipo_local)!.replace('http://localhost:5000', API_URL) : getLogoEquipo(isLocal ? partido.id_equipo_visitante : partido.id_equipo_local)! }}
                        style={styles.partidoEquipoLogo}
                        onError={() => console.warn('Error cargando logo equipo visitante')}
                      />
                    ) : (
                      <View style={styles.partidoEquipoLogoPlaceholder}>
                        <Text style={styles.partidoEquipoLogoText}>
                          {rival.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <Text style={styles.partidoEquipoNombre} numberOfLines={1}>
                      {rival}
                    </Text>
                  </View>
                </View>
                {partido.lugar && (
                  <Text style={styles.partidoLugar}>🏟️ {partido.lugar}</Text>
                )}
              </View>
            </View>
          );
        })}
      </ScrollView>
    );
  };

  const renderJugadores = () => {
    if (jugadores.length === 0) {
      return (
        <View style={styles.tabContent}>
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>👥</Text>
            <Text style={styles.emptyText}>No hay jugadores registrados</Text>
          </View>
        </View>
      );
    }

    return (
      <ScrollView style={styles.tabContent}>
        {jugadores.map((jugador) => (
          <View key={jugador.id_jugador} style={styles.jugadorCard}>
      <View style={styles.jugadorInfo}>
              {jugador.foto_url ? (
                <Image
                  source={{ uri: jugador.foto_url.includes('localhost') ? jugador.foto_url.replace('http://localhost:5000', API_URL) : jugador.foto_url }}
                  style={styles.jugadorFoto}
                />
              ) : (
                <View style={styles.jugadorFotoPlaceholder}>
                  <Text style={styles.jugadorFotoText}>
                    {jugador.nombre.charAt(0).toUpperCase()}
                  </Text>
                </View>
              )}
              <View style={styles.jugadorDatos}>
        <Text style={styles.jugadorNombre}>
                  {jugador.nombre} {jugador.apellido}
        </Text>
                {jugador.posicion && (
                  <Text style={styles.jugadorPosicion}>{jugador.posicion}</Text>
                )}
              </View>
              {jugador.dorsal && (
                <View style={styles.jugadorDorsal}>
                  <Text style={styles.jugadorDorsalText}>{jugador.dorsal}</Text>
                </View>
        )}
      </View>
    </View>
        ))}
      </ScrollView>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Volver</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Cargando...</Text>
        </View>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </View>
    );
  }

  if (!equipo) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Text style={styles.backButtonText}>← Volver</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Equipo no encontrado</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonText}>← Volver</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{equipo.nombre}</Text>
      </View>

      {/* Info del equipo */}
      <View style={styles.equipoInfo}>
        {equipo.logo_url ? (
          <Image
            source={{ uri: equipo.logo_url.includes('localhost') ? equipo.logo_url.replace('http://localhost:5000', API_URL) : equipo.logo_url }}
            style={styles.equipoLogo}
          />
        ) : (
          <View style={styles.equipoLogoPlaceholder}>
            <Text style={styles.equipoLogoText}>{equipo.nombre.charAt(0).toUpperCase()}</Text>
        </View>
        )}
        {equipo.estadio && (
          <Text style={styles.equipoEstadio}>🏟️ {equipo.estadio}</Text>
        )}
        {posicionEquipo && (
          <Text style={styles.equipoPosicion}>Posición: {posicionEquipo}°</Text>
          )}
        </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {renderTabButton('tabla', 'Tabla')}
        {renderTabButton('partidos', 'Partidos')}
        {renderTabButton('jugadores', 'Jugadores')}
      </View>

      {/* Tab Content */}
      {activeTab === 'tabla' && renderTabla()}
      {activeTab === 'partidos' && renderPartidos()}
      {activeTab === 'jugadores' && renderJugadores()}
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
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212121',
    flex: 1,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  equipoInfo: {
    backgroundColor: '#FFFFFF',
    padding: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  equipoLogo: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 10,
  },
  equipoLogoPlaceholder: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  equipoLogoText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  equipoEstadio: {
    fontSize: 14,
    color: '#757575',
    marginTop: 5,
  },
  equipoPosicion: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
    marginTop: 5,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 15,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabButtonActive: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    fontSize: 14,
    color: '#757575',
    fontWeight: '500',
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
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
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#9E9E9E',
    textAlign: 'center',
  },
  // Tabla de posiciones
  tablaContainer: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    borderRadius: 8,
    overflow: 'hidden',
  },
  tablaHeader: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  tablaHeaderPos: {
    width: 30,
    fontSize: 11,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  tablaHeaderEquipo: {
    flex: 1,
    fontSize: 11,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 8,
  },
  tablaHeaderPJ: { width: 30, fontSize: 11, fontWeight: 'bold', color: '#FFFFFF', textAlign: 'center' },
  tablaHeaderG: { width: 30, fontSize: 11, fontWeight: 'bold', color: '#FFFFFF', textAlign: 'center' },
  tablaHeaderE: { width: 30, fontSize: 11, fontWeight: 'bold', color: '#FFFFFF', textAlign: 'center' },
  tablaHeaderP: { width: 30, fontSize: 11, fontWeight: 'bold', color: '#FFFFFF', textAlign: 'center' },
  tablaHeaderGF: { width: 35, fontSize: 11, fontWeight: 'bold', color: '#FFFFFF', textAlign: 'center' },
  tablaHeaderGC: { width: 35, fontSize: 11, fontWeight: 'bold', color: '#FFFFFF', textAlign: 'center' },
  tablaHeaderDG: { width: 35, fontSize: 11, fontWeight: 'bold', color: '#FFFFFF', textAlign: 'center' },
  tablaHeaderPts: { width: 40, fontSize: 11, fontWeight: 'bold', color: '#FFFFFF', textAlign: 'center' },
  tablaRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
    alignItems: 'center',
  },
  tablaRowHighlighted: {
    backgroundColor: '#E3F2FD',
  },
  tablaPos: {
    width: 30,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    color: '#212121',
  },
  tablaPosHighlighted: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  tablaEquipo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  tablaLogo: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
  },
  tablaLogoPlaceholder: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  tablaLogoText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  tablaEquipoNombre: {
    flex: 1,
    fontSize: 12,
    color: '#212121',
  },
  tablaEquipoNombreHighlighted: {
    fontWeight: 'bold',
    color: colors.primary,
  },
  tablaCell: {
    width: 30,
    fontSize: 12,
    textAlign: 'center',
    color: '#212121',
  },
  tablaPts: {
    width: 40,
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#212121',
  },
  tablaPtsHighlighted: {
    color: colors.primary,
  },
  // Partidos
  partidoCard: {
    backgroundColor: '#FFFFFF',
    margin: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  partidoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  partidoFecha: {
    fontSize: 12,
    color: '#757575',
  },
  partidoJornada: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  partidoBody: {
    alignItems: 'center',
  },
  partidoEquipos: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    width: '100%',
  },
  partidoEquipoContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  partidoEquipoLogo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginBottom: 4,
  },
  partidoEquipoLogoPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  partidoEquipoLogoText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  partidoEquipoNombre: {
    fontSize: 12,
    fontWeight: '600',
    color: '#212121',
    textAlign: 'center',
    maxWidth: 100,
  },
  partidoVs: {
    fontSize: 14,
    color: '#757575',
    marginHorizontal: 12,
    fontWeight: '600',
  },
  partidoLugar: {
    fontSize: 12,
    color: '#757575',
    marginTop: 4,
  },
  // Jugadores
  jugadorCard: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 16,
    marginBottom: 12,
    padding: 16,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  jugadorInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  jugadorFoto: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  jugadorFotoPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  jugadorFotoText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  jugadorDatos: {
    flex: 1,
  },
  jugadorNombre: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
    marginBottom: 4,
  },
  jugadorPosicion: {
    fontSize: 12,
    color: '#757575',
  },
  jugadorDorsal: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  jugadorDorsalText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
});
