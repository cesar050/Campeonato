import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Linking,
  Platform,
  BackHandler,
} from 'react-native';
import axios from 'axios';
import { colors } from '../theme/colors';
import { API_BASE_URL, API_TIMEOUT } from '../utils/constants';
import { SedesMapScreen } from './SedesMapScreen';

const API_URL = API_BASE_URL;

interface CampeonatoDetail {
  id_campeonato: number;
  nombre: string;
  descripcion: string;
  fecha_inicio: string;
  fecha_fin: string;
  tipo_deporte: string;
  tipo_competicion: string;
  estado: string;
  total_equipos_inscritos: number;
  max_equipos: number;
  logo_url?: string;
  creado_por?: number;
  organizador?: string;
  inscripciones_abiertas?: boolean;
  fecha_inicio_inscripciones?: string;
  fecha_cierre_inscripciones?: string;
}

interface Equipo {
  id_equipo: number;
  nombre: string;
  logo_url?: string;
  estadio?: string;
  estadio_latitud?: number;
  estadio_longitud?: number;
  lider?: string;
  total_jugadores?: number;
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
  id_equipo_local: number;
  id_equipo_visitante: number;
  equipo_local: string;
  equipo_visitante: string;
  goles_local: number | null;
  goles_visitante: number | null;
  fecha_partido?: string;
  fecha_hora?: string;
  estado: string;
  jornada: number;
  lugar?: string;
}

type TabType = 'informacion' | 'posiciones' | 'partidos';
type PartidoFilter = 'todos' | 'jugados' | 'por_jugar' | 'suspendidos';

interface Props {
  campeonatoId: number;
  onBack: () => void;
  onSelectEquipo?: (id: number) => void;
  onSelectPartido?: (id: number) => void;
}

export const CampeonatoDetailScreen: React.FC<Props> = ({ 
  campeonatoId, 
  onBack, 
  onSelectEquipo,
  onSelectPartido 
}) => {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('informacion');
  const [partidoFilter, setPartidoFilter] = useState<PartidoFilter>('todos');
  const [campeonato, setCampeonato] = useState<CampeonatoDetail | null>(null);
  const [equipos, setEquipos] = useState<Equipo[]>([]);
  const [tabla, setTabla] = useState<Posicion[]>([]);
  const [partidos, setPartidos] = useState<Partido[]>([]);
  const [filteredPartidos, setFilteredPartidos] = useState<Partido[]>([]);
  const [showSedesMap, setShowSedesMap] = useState(false);

  useEffect(() => {
    loadData();
  }, [campeonatoId]);

  useEffect(() => {
    applyPartidoFilter();
  }, [partidos, partidoFilter]);

  // Manejar el botón de atrás del hardware cuando el mapa de sedes está abierto
  useEffect(() => {
    if (Platform.OS !== 'android') {
      return;
    }

    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      // Si el mapa de sedes está abierto, cerrarlo
      if (showSedesMap) {
        setShowSedesMap(false);
        return true; // Indica que manejamos el evento
      }
      
      // Si no hay mapa abierto, permitir el comportamiento por defecto
      // (que sería volver a la pantalla anterior)
      return false;
    });

    // Limpiar el listener cuando el componente se desmonte o cambie showSedesMap
    return () => backHandler.remove();
  }, [showSedesMap]);

  const loadData = async () => {
    try {
      setLoading(true);

      const campRes = await axios.get(`${API_URL}/campeonatos/${campeonatoId}`, {
        timeout: API_TIMEOUT,
      });
      // El backend devuelve { campeonato: {...} } con el envelope
      const campeonatoData = campRes.data.campeonato || campRes.data;
      console.log('📋 [CampeonatoDetailScreen] Datos del campeonato:', {
        id: campeonatoData.id_campeonato,
        nombre: campeonatoData.nombre,
        descripcion: campeonatoData.descripcion,
        tiene_descripcion: !!campeonatoData.descripcion,
      });
      setCampeonato(campeonatoData);

      try {
        const equiposRes = await axios.get(`${API_URL}/campeonatos/${campeonatoId}/inscripciones`, {
          params: { estado: 'aprobado' },
          timeout: API_TIMEOUT,
        });
        const equiposData = equiposRes.data.inscripciones?.map((i: any) => i.equipo) || [];
        setEquipos(equiposData);
      } catch (error) {
        console.log('Error cargando equipos:', error);
        setEquipos([]);
      }

      try {
        const tablaRes = await axios.get(`${API_URL}/estadisticas/tabla-posiciones`, {
          params: { id_campeonato: campeonatoId },
          timeout: API_TIMEOUT,
        });
        const tablaData = tablaRes.data.tabla_posiciones || [];
        const tablaNormalizada = tablaData.map((item: any) => ({
          ...item,
          equipo: item.equipo || item.nombre
        }));
        setTabla(tablaNormalizada);
      } catch (error) {
        console.log('Error cargando tabla:', error);
        setTabla([]);
      }

      try {
        const partidosRes = await axios.get(`${API_URL}/partidos`, {
          params: { id_campeonato: campeonatoId },
          timeout: API_TIMEOUT,
        });
        const partidosData = partidosRes.data.data?.partidos || 
                            partidosRes.data.partidos || 
                            partidosRes.data || [];
        setPartidos(partidosData);
      } catch (error) {
        console.log('Error cargando partidos:', error);
        setPartidos([]);
      }

    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyPartidoFilter = () => {
    let filtered = [...partidos];

    if (partidoFilter === 'jugados') {
      filtered = filtered.filter(p => p.estado === 'finalizado');
    } else if (partidoFilter === 'por_jugar') {
      filtered = filtered.filter(p => p.estado === 'programado' || p.estado === 'en_juego');
    } else if (partidoFilter === 'suspendidos') {
      filtered = filtered.filter(p => p.estado === 'cancelado' || p.estado === 'suspendido');
    }

    setFilteredPartidos(filtered);
  };

  const openMaps = (estadio: string) => {
    const query = encodeURIComponent(estadio);
    const scheme = Platform.select({
      ios: 'maps:0,0?q=',
      android: 'geo:0,0?q='
    });
    const url = Platform.select({
      ios: `${scheme}${query}`,
      android: `${scheme}${query}`
    });

    Linking.openURL(url || `https://www.google.com/maps/search/?api=1&query=${query}`);
  };

  const formatFechaCompleta = (fecha: string) => {
    if (!fecha) return 'Fecha no disponible';
    const date = new Date(fecha);
    if (isNaN(date.getTime())) return 'Fecha inválida';
    
    const dia = date.getDate();
    const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 
                   'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    const mes = meses[date.getMonth()];
    const año = date.getFullYear();
    return `${dia} de ${mes} de ${año}`;
  };

  const formatFechaCorta = (fecha: string) => {
    if (!fecha) return '-';
    const date = new Date(fecha);
    if (isNaN(date.getTime())) return '-';
    
    const dia = date.getDate();
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const mes = meses[date.getMonth()];
    return `${dia} ${mes}`;
  };

  const getTipoDeporte = () => {
    if (!campeonato) return 'Fútbol';
    return campeonato.tipo_deporte === 'indoor' ? 'Fútbol Indoor' : 'Fútbol Campo';
  };

  const renderTabButton = (tab: TabType, label: string) => (
    <TouchableOpacity
      style={[styles.tabButton, activeTab === tab && styles.tabButtonActive]}
      onPress={() => setActiveTab(tab)}
      activeOpacity={0.7}
    >
      <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
        {label}
      </Text>
      {activeTab === tab && <View style={styles.tabIndicator} />}
    </TouchableOpacity>
  );

  const renderInformacion = () => {
    const jugados = partidos.filter(p => p.estado === 'finalizado').length;
    const porJugar = partidos.filter(p => p.estado === 'programado').length;

    // Obtener estadios únicos con coordenadas
    const estadiosConCoordenadas = equipos.filter(
      e => e.estadio && e.estadio_latitud && e.estadio_longitud
    );
    const tieneSedesConUbicacion = estadiosConCoordenadas.length > 0;

    const estadiosUnicos = Array.from(
      new Set(equipos.filter(e => e.estadio).map(e => e.estadio))
    );

    return (
      <View style={styles.tabContent}>
        <Text style={styles.sectionTitle}>Acerca del Campeonato</Text>
        <Text style={styles.descripcion}>
          {campeonato?.descripcion || 'Sin descripción disponible'}
        </Text>

        <View style={styles.infoGrid}>
          <View style={styles.infoCard}>
            <View style={styles.iconCircle}>
              <Text style={styles.iconText}>
                {campeonato?.tipo_deporte === 'indoor' ? '🏟️' : '⚽'}
              </Text>
            </View>
            <Text style={styles.infoCardLabel}>Tipo</Text>
            <Text style={styles.infoCardValue}>
              {getTipoDeporte()}
            </Text>
          </View>

          <View style={styles.infoCard}>
            <View style={styles.iconCircle}>
              <Text style={styles.iconText}>📅</Text>
            </View>
            <Text style={styles.infoCardLabel}>Fechas</Text>
            <Text style={styles.infoCardValue}>
              {campeonato && formatFechaCorta(campeonato.fecha_inicio)}
            </Text>
            <Text style={styles.infoCardSubValue}>-</Text>
            <Text style={styles.infoCardValue}>
              {campeonato && formatFechaCorta(campeonato.fecha_fin)}
            </Text>
          </View>

          <View style={styles.infoCard}>
            <View style={styles.iconCircle}>
              <Text style={styles.iconText}>👥</Text>
            </View>
            <Text style={styles.infoCardLabel}>Equipos</Text>
            <Text style={styles.infoCardValue}>
              {equipos.length}
            </Text>
            <Text style={styles.infoCardSubValue}>Participantes</Text>
          </View>

          <View style={styles.infoCard}>
            <View style={styles.iconCircle}>
              <Text style={styles.iconText}>⚽</Text>
            </View>
            <Text style={styles.infoCardLabel}>Partidos</Text>
            <Text style={styles.infoCardValue}>{jugados} jugados</Text>
            <Text style={styles.infoCardSubValue}>{porJugar} por jugar</Text>
          </View>
        </View>

        <View style={styles.organizadorCard}>
          <View style={styles.iconCircleSmall}>
            <Text style={styles.iconTextSmall}>👤</Text>
          </View>
          <View style={styles.organizadorInfo}>
            <Text style={styles.organizadorLabel}>Organizado por</Text>
            <Text style={styles.organizadorNombre}>
              {campeonato?.organizador || 'Administrador del sistema'}
            </Text>
          </View>
        </View>

        {/* Equipos Participantes */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Equipos Participantes</Text>
          <Text style={styles.sectionSubtitle}>{equipos.length} equipos</Text>
        </View>
        
        {equipos.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>👥</Text>
            <Text style={styles.emptyText}>No hay equipos inscritos</Text>
          </View>
        ) : (
          equipos.map((equipo, index) => {
            const posicion = tabla.find(t => t.id_equipo === equipo.id_equipo);
            
            return (
              <TouchableOpacity 
                key={index} 
                style={styles.equipoCard}
                onPress={() => onSelectEquipo && onSelectEquipo(equipo.id_equipo)}
                activeOpacity={0.7}
              >
                <View style={styles.equipoCardLeft}>
                  {equipo.logo_url ? (
                    <Image source={{ uri: equipo.logo_url }} style={styles.equipoLogo} />
                  ) : (
                    <View style={styles.equipoLogoPlaceholder}>
                      <Text style={styles.equipoLogoText}>{equipo.nombre.charAt(0)}</Text>
                    </View>
                  )}
                  <View style={styles.equipoInfo}>
                    <Text style={styles.equipoNombreCard}>{equipo.nombre}</Text>
                    {equipo.estadio && (
                      <View style={styles.equipoMetaInfo}>
                        <Text style={styles.metaIcon}>🏟️</Text>
                        <Text style={styles.equipoDetalle}>
                          {equipo.estadio}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
                <View style={styles.equipoCardRight}>
                  {posicion && (
                    <View style={styles.equipoPosicion}>
                      <Text style={styles.equipoPosicionNum}>{posicion.posicion}°</Text>
                      <Text style={styles.equipoPosicionLabel}>posición</Text>
                    </View>
                  )}
                  <Text style={styles.chevron}>›</Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}

        {/* Sedes del Campeonato */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Sedes del Campeonato</Text>
          {tieneSedesConUbicacion && (
            <TouchableOpacity 
              onPress={() => setShowSedesMap(true)}
              activeOpacity={0.7}
            >
              <Text style={styles.verMapaCompleto}>Ver mapa completo</Text>
            </TouchableOpacity>
          )}
        </View>
        
        {estadiosUnicos.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🏟️</Text>
            <Text style={styles.emptyText}>No hay sedes registradas</Text>
          </View>
        ) : (
          estadiosUnicos.map((estadio, index) => (
            <View key={index} style={styles.sedeCard}>
              <View style={styles.iconCircleSmall}>
                <Text style={styles.iconTextSmall}>🏟️</Text>
              </View>
              <View style={styles.sedeInfo}>
                <Text style={styles.sedeNombre}>{estadio}</Text>
                <Text style={styles.sedeEquipo}>
                  {equipos.filter(e => e.estadio === estadio).length} equipo(s)
                </Text>
              </View>
              <TouchableOpacity 
                style={styles.sedeButton}
                onPress={() => setShowSedesMap(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.sedeButtonIcon}>🗺️</Text>
                <Text style={styles.sedeButtonText}>Ver en mapa</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>
    );
  };

  const renderPosiciones = () => (
    <View style={styles.tabContent}>
      {tabla.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📊</Text>
          <Text style={styles.emptyText}>No hay tabla de posiciones disponible</Text>
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.tablaContainer}>
            <View style={styles.tablaHeader}>
              <Text style={[styles.tablaHeaderText, { width: 40 }]}>#</Text>
              <Text style={[styles.tablaHeaderText, { width: 150 }]}>Equipo</Text>
              <Text style={[styles.tablaHeaderText, { width: 55 }]}>PTS</Text>
              <Text style={[styles.tablaHeaderText, { width: 40 }]}>PJ</Text>
              <Text style={[styles.tablaHeaderText, { width: 40 }]}>PG</Text>
              <Text style={[styles.tablaHeaderText, { width: 40 }]}>PE</Text>
              <Text style={[styles.tablaHeaderText, { width: 40 }]}>PP</Text>
              <Text style={[styles.tablaHeaderText, { width: 40 }]}>GF</Text>
              <Text style={[styles.tablaHeaderText, { width: 40 }]}>GC</Text>
              <Text style={[styles.tablaHeaderText, { width: 40 }]}>DG</Text>
            </View>
            {tabla.map((item, index) => (
              <View key={index} style={styles.tablaRow}>
                <View style={[styles.posicionCell, { width: 40 }]}>
                  <View style={[styles.posicionBadge, item.posicion <= 3 && styles.posicionDestacada]}>
                    <Text style={[styles.posicionText, item.posicion <= 3 && styles.posicionTextDestacada]}>
                      {item.posicion}
                    </Text>
                  </View>
                </View>
                <View style={[styles.equipoCell, { width: 150 }]}>
                  {item.logo_url ? (
                    <Image source={{ uri: item.logo_url }} style={styles.escudoSmall} />
                  ) : (
                    <View style={styles.escudoPlaceholder}>
                      <Text style={styles.escudoText}>{item.equipo.charAt(0)}</Text>
                    </View>
                  )}
                  <Text style={styles.equipoNombre} numberOfLines={1}>
                    {item.equipo}
                  </Text>
                </View>
                <Text style={[styles.tablaValue, styles.puntosDestacado, { width: 55 }]}>{item.puntos}</Text>
                <Text style={[styles.tablaValue, { width: 40 }]}>{item.partidos_jugados}</Text>
                <Text style={[styles.tablaValue, { width: 40 }]}>{item.ganados}</Text>
                <Text style={[styles.tablaValue, { width: 40 }]}>{item.empatados}</Text>
                <Text style={[styles.tablaValue, { width: 40 }]}>{item.perdidos}</Text>
                <Text style={[styles.tablaValue, { width: 40 }]}>{item.goles_favor}</Text>
                <Text style={[styles.tablaValue, { width: 40 }]}>{item.goles_contra}</Text>
                <Text style={[styles.tablaValue, { width: 40 }]}>{item.diferencia_goles}</Text>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  );

  const renderPartidos = () => {
    const getLogoEquipo = (nombreEquipo: string) => {
      const equipo = equipos.find(e => e.nombre === nombreEquipo);
      return equipo?.logo_url;
    };

    return (
      <View style={styles.tabContent}>
        <View style={styles.partidoFilters}>
          <TouchableOpacity
            style={[styles.partidoFilter, partidoFilter === 'todos' && styles.partidoFilterActive]}
            onPress={() => setPartidoFilter('todos')}
            activeOpacity={0.7}
          >
            <Text style={[styles.partidoFilterIcon, partidoFilter === 'todos' && styles.partidoFilterIconActive]}>
              ●
            </Text>
            <Text style={[styles.partidoFilterText, partidoFilter === 'todos' && styles.partidoFilterTextActive]}>
              Todos
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.partidoFilter, partidoFilter === 'jugados' && styles.partidoFilterActive]}
            onPress={() => setPartidoFilter('jugados')}
            activeOpacity={0.7}
          >
            <Text style={[styles.partidoFilterIcon, partidoFilter === 'jugados' && styles.partidoFilterIconActive]}>
              ✓
            </Text>
            <Text style={[styles.partidoFilterText, partidoFilter === 'jugados' && styles.partidoFilterTextActive]}>
              Jugados
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.partidoFilter, partidoFilter === 'por_jugar' && styles.partidoFilterActive]}
            onPress={() => setPartidoFilter('por_jugar')}
            activeOpacity={0.7}
          >
            <Text style={[styles.partidoFilterIcon, partidoFilter === 'por_jugar' && styles.partidoFilterIconActive]}>
              ⏱️
            </Text>
            <Text style={[styles.partidoFilterText, partidoFilter === 'por_jugar' && styles.partidoFilterTextActive]}>
              Por jugar
            </Text>
          </TouchableOpacity>
        </View>

        {filteredPartidos.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>⚽</Text>
            <Text style={styles.emptyText}>No hay partidos disponibles</Text>
          </View>
        ) : (
          filteredPartidos.map((partido) => {
            const logoLocal = getLogoEquipo(partido.equipo_local);
            const logoVisitante = getLogoEquipo(partido.equipo_visitante);

            return (
              <TouchableOpacity 
                key={partido.id_partido} 
                style={styles.partidoCardDetail}
                onPress={() => onSelectPartido && onSelectPartido(partido.id_partido)}
                activeOpacity={0.7}
              >
                <View style={styles.partidoHeaderDetail}>
                  <View style={styles.partidoJornadaBadge}>
                    <Text style={styles.jornadaIcon}>📋</Text>
                    <Text style={styles.partidoJornadaDetail}>Jornada {partido.jornada}</Text>
                  </View>
                </View>

                <View style={styles.partidoBodyDetail}>
                  <View style={styles.equipoContainerDetail}>
                    {logoLocal ? (
                      <Image source={{ uri: logoLocal }} style={styles.escudoPartido} />
                    ) : (
                      <View style={styles.escudoPartidoPlaceholder}>
                        <Text style={styles.escudoPartidoText}>{partido.equipo_local.charAt(0)}</Text>
                      </View>
                    )}
                    <Text style={styles.equipoNombrePartidoDetail} numberOfLines={1}>
                      {partido.equipo_local}
                    </Text>
                  </View>

                  <View style={styles.marcadorContainerDetail}>
                    <Text style={styles.marcadorDetail}>
                      {partido.goles_local ?? 0} - {partido.goles_visitante ?? 0}
                    </Text>
                  </View>

                  <View style={styles.equipoContainerDetail}>
                    {logoVisitante ? (
                      <Image source={{ uri: logoVisitante }} style={styles.escudoPartido} />
                    ) : (
                      <View style={styles.escudoPartidoPlaceholder}>
                        <Text style={styles.escudoPartidoText}>{partido.equipo_visitante.charAt(0)}</Text>
                      </View>
                    )}
                    <Text style={styles.equipoNombrePartidoDetail} numberOfLines={1}>
                      {partido.equipo_visitante}
                    </Text>
                  </View>
                </View>
                <Text style={styles.partidoFechaDetail}>
                  {formatFechaCompleta(partido.fecha_partido || partido.fecha_hora || '')}
                </Text>
                {partido.lugar && (
                  <TouchableOpacity 
                    style={styles.lugarContainer}
                    onPress={() => openMaps(partido.lugar || '')}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.lugarIcon}>📍</Text>
                    <Text style={styles.partidoLugarDetail}>{partido.lugar}</Text>
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            );
          })
        )}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!campeonato) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>Campeonato no encontrado</Text>
        <TouchableOpacity style={styles.backButtonAlt} onPress={onBack}>
          <Text style={styles.backButtonAltText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Si showSedesMap es true, mostrar pantalla de mapas
  if (showSedesMap) {
    return (
      <SedesMapScreen 
        campeonatoId={campeonatoId}
        onBack={() => setShowSedesMap(false)}
      />
    );
  }

  return (
    <View style={styles.container}>
      {/* Header con imagen */}
      <View style={styles.headerImage}>
        {campeonato.logo_url ? (
          <Image source={{ uri: campeonato.logo_url }} style={styles.headerImageFull} />
        ) : (
          <View style={styles.headerImagePlaceholder}>
            <Text style={styles.headerIcon}>
              {campeonato.tipo_deporte === 'indoor' ? '🏟️' : '⚽'}
            </Text>
          </View>
        )}
        <View style={styles.headerOverlay} />
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.titleContainer}>
        <Text style={styles.title} numberOfLines={2}>{campeonato.nombre}</Text>
      </View>

      <View style={styles.tabsContainer}>
        {renderTabButton('informacion', 'INFORMACIÓN')}
        {renderTabButton('posiciones', 'POSICIONES')}
        {renderTabButton('partidos', 'PARTIDOS')}
      </View>

      <ScrollView style={styles.content}>
        {activeTab === 'informacion' && renderInformacion()}
        {activeTab === 'posiciones' && renderPosiciones()}
        {activeTab === 'partidos' && renderPartidos()}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#616161',
    marginBottom: 16,
  },
  backButtonAlt: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: colors.primary,
    borderRadius: 8,
  },
  backButtonAltText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },

  // ===== HEADER IMAGE =====
  headerImage: {
    width: '100%',
    height: 240,
    backgroundColor: colors.primary,
    position: 'relative',
  },
  headerImageFull: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  headerImagePlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerIcon: {
    fontSize: 100,
  },
  headerOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 120,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  backButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: 'bold',
  },

  // ===== TITLE =====
  titleContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingVertical: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212121',
  },

  // ===== TABS =====
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    position: 'relative',
  },
  tabButtonActive: {
    backgroundColor: '#FAFAFA',
  },
  tabText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#757575',
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: 'bold',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: colors.primary,
  },

  // ===== CONTENT =====
  content: {
    flex: 1,
  },
  tabContent: {
    padding: 24,
  },

  // ===== SECTION =====
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212121',
    marginBottom: 16,
    marginTop: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#757575',
  },
  verMapaCompleto: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  descripcion: {
    fontSize: 15,
    color: '#616161',
    lineHeight: 22,
    marginBottom: 24,
  },

  // ===== INFO GRID =====
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  infoCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconText: {
    fontSize: 28,
  },
  iconCircleSmall: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconTextSmall: {
    fontSize: 20,
  },
  infoCardLabel: {
    fontSize: 12,
    color: '#757575',
    marginBottom: 4,
  },
  infoCardValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212121',
    textAlign: 'center',
  },
  infoCardSubValue: {
    fontSize: 12,
    color: '#757575',
    textAlign: 'center',
  },

  // ===== ORGANIZADOR =====
  organizadorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  organizadorInfo: {
    flex: 1,
  },
  organizadorLabel: {
    fontSize: 12,
    color: '#757575',
    marginBottom: 4,
  },
  organizadorNombre: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212121',
  },

  // ===== EQUIPOS =====
  equipoCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  equipoCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  equipoCardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  equipoLogo: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
    resizeMode: 'cover',
  },
  equipoLogoPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  equipoLogoText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  equipoInfo: {
    flex: 1,
  },
  equipoNombreCard: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212121',
    marginBottom: 4,
  },
  equipoMetaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaIcon: {
    fontSize: 12,
  },
  equipoDetalle: {
    fontSize: 13,
    color: '#757575',
  },
  equipoPosicion: {
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  equipoPosicionNum: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
  },
  equipoPosicionLabel: {
    fontSize: 10,
    color: '#757575',
  },
  chevron: {
    fontSize: 24,
    color: '#BDBDBD',
  },

  // ===== SEDES =====
  sedeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  sedeInfo: {
    flex: 1,
  },
  sedeNombre: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212121',
    marginBottom: 4,
  },
  sedeEquipo: {
    fontSize: 13,
    color: '#757575',
  },
  sedeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  sedeButtonIcon: {
    fontSize: 14,
  },
  sedeButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },

  // ===== TABLA =====
  tablaContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  tablaHeader: {
    flexDirection: 'row',
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: '#E0E0E0',
  },
  tablaHeaderText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#757575',
    textAlign: 'center',
  },
  tablaRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
    alignItems: 'center',
  },
  posicionCell: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  posicionBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  posicionDestacada: {
    backgroundColor: colors.primary,
  },
  posicionText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#616161',
  },
  posicionTextDestacada: {
    color: '#FFFFFF',
  },
  equipoCell: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  escudoSmall: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 8,
    resizeMode: 'cover',
  },
  escudoPlaceholder: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  escudoText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  equipoNombre: {
    fontSize: 13,
    fontWeight: '600',
    color: '#212121',
    flex: 1,
  },
  tablaValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#212121',
    textAlign: 'center',
  },
  puntosDestacado: {
    fontWeight: 'bold',
    fontSize: 16,
    color: colors.primary,
  },

  // ===== PARTIDOS FILTERS =====
  partidoFilters: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  partidoFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  partidoFilterActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  partidoFilterIcon: {
    fontSize: 14,
  },
  partidoFilterIconActive: {
    color: '#FFFFFF',
  },
  partidoFilterText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#616161',
  },
  partidoFilterTextActive: {
    color: '#FFFFFF',
  },

  // ===== PARTIDO CARD =====
  partidoCardDetail: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  partidoHeaderDetail: {
    marginBottom: 12,
  },
  partidoJornadaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  jornadaIcon: {
    fontSize: 14,
  },
  partidoJornadaDetail: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  partidoBodyDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  equipoContainerDetail: {
    flex: 1,
    alignItems: 'center',
  },
  escudoPartido: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginBottom: 8,
    resizeMode: 'cover',
  },
  escudoPartidoPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  escudoPartidoText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  equipoNombrePartidoDetail: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212121',
    textAlign: 'center',
  },
  marcadorContainerDetail: {
    paddingHorizontal: 16,
  },
  marcadorDetail: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#212121',
  },
  partidoFechaDetail: {
    fontSize: 13,
    color: '#757575',
    textAlign: 'center',
  },
  lugarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
  },
  lugarIcon: {
    fontSize: 14,
  },
  partidoLugarDetail: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },

  // ===== EMPTY STATE =====
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 14,
    color: '#757575',
    textAlign: 'center',
  },
});



