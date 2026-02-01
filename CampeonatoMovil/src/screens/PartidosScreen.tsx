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
  Alert,
} from 'react-native';
import axios from 'axios';
import { colors } from '../theme/colors';
import { API_BASE_URL } from '../utils/constants';
import { VoiceSearchButton } from '../components/VoiceSearchButton';
import { processVoiceCommand, findTeamByName, isSameDay } from '../utils/voiceCommandProcessor';

const API_URL = API_BASE_URL;

interface Partido {
  id_partido: number;
  id_campeonato?: number;
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
    id_campeonato?: number;
    nombre: string;
  };
}

interface EquipoLogo {
  [key: number]: string | null;
}

interface Campeonato {
  id_campeonato: number;
  nombre: string;
  estado: string;
  logo_url?: string | null;
  descripcion?: string;
  tipo_deporte?: string;
  total_partidos?: number;
  total_equipos_inscritos?: number;
}

type FilterType = 'todos' | 'en_juego' | 'programado' | 'finalizado';

interface Props {
  onSelectPartido?: (id: number) => void;
}

export const PartidosScreen: React.FC<Props> = ({ onSelectPartido }) => {
  const [partidos, setPartidos] = useState<Partido[]>([]);
  const [filteredPartidos, setFilteredPartidos] = useState<Partido[]>([]);
  const [loading, setLoading] = useState(false); // Cambiado a false inicialmente
  const [loadingCampeonatos, setLoadingCampeonatos] = useState(true); // Estado separado para campeonatos
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('todos');
  const [selectedCampeonato, setSelectedCampeonato] = useState<number | null>(null);
  const [campeonatos, setCampeonatos] = useState<Campeonato[]>([]);
  const [equiposLogos, setEquiposLogos] = useState<EquipoLogo>({});
  const [showCampeonatos, setShowCampeonatos] = useState(true); // Nueva vista de campeonatos
  const [equiposNombres, setEquiposNombres] = useState<string[]>([]); // Para búsqueda por voz

  useEffect(() => {
    loadCampeonatos();
  }, []);

  useEffect(() => {
    if (selectedCampeonato) {
      loadPartidos();
    } else {
      setPartidos([]);
      setFilteredPartidos([]);
      setLoading(false);
    }
  }, [selectedCampeonato]);

  useEffect(() => {
    applyFilters();
  }, [partidos, activeFilter]);

  const loadCampeonatos = async () => {
    try {
      setLoadingCampeonatos(true);
      console.log('🔍 Cargando campeonatos desde:', `${API_URL}/campeonatos`);
      
      // Cargar todos los campeonatos (no solo en_curso para ver todos)
      const response = await axios.get(`${API_URL}/campeonatos`, {
        timeout: 10000,
      });
      
      const data = response.data.campeonatos || response.data || [];
      console.log('📦 Campeonatos recibidos:', data.length);
      
      // Filtrar solo los que tienen estado relevante
      const campeonatosFiltrados = data.filter((c: Campeonato) => 
        c.estado === 'en_curso' || c.estado === 'planificacion' || c.estado === 'finalizado'
      );
      
      console.log('✅ Campeonatos filtrados:', campeonatosFiltrados.length);
      setCampeonatos(campeonatosFiltrados);
    } catch (error: any) {
      console.error('❌ Error cargando campeonatos:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
      setCampeonatos([]);
    } finally {
      setLoadingCampeonatos(false);
      setRefreshing(false);
    }
  };

  const loadPartidos = async () => {
    if (!selectedCampeonato) {
      setPartidos([]);
      setFilteredPartidos([]);
      return;
    }

    try {
      setLoading(true);
      
      // Usar el endpoint específico de partidos por campeonato
      const response = await axios.get(`${API_URL}/campeonatos/${selectedCampeonato}/partidos`);
      const data = response.data.partidos || response.data.data?.partidos || [];
      
      // Normalizar datos
      const partidosNormalizados = data.map((p: any) => ({
        ...p,
        id_campeonato: selectedCampeonato,
        campeonato: {
          id_campeonato: selectedCampeonato,
          nombre: response.data.campeonato || 'Campeonato',
        },
      }));
      
      setPartidos(partidosNormalizados);
      
      // Cargar logos de los equipos
      await loadEquiposLogos(partidosNormalizados);
    } catch (error) {
      console.error('Error cargando partidos:', error);
      setPartidos([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadEquiposLogos = async (partidosData: Partido[]) => {
    try {
      // Obtener IDs únicos de equipos
      const equiposIds = new Set<number>();
      partidosData.forEach(partido => {
        if (partido.id_equipo_local) equiposIds.add(partido.id_equipo_local);
        if (partido.id_equipo_visitante) equiposIds.add(partido.id_equipo_visitante);
      });

      // Cargar logos de todos los equipos
      const logos: EquipoLogo = {};
      const nombres: string[] = [];
      await Promise.all(
        Array.from(equiposIds).map(async (idEquipo) => {
          try {
            const equipoRes = await axios.get(`${API_URL}/equipos/${idEquipo}`);
            const equipo = equipoRes.data.equipo || equipoRes.data;
            let logoUrl = equipo.logo_url;
            
            // Corregir URL si usa localhost
            if (logoUrl && logoUrl.includes('localhost')) {
              logoUrl = logoUrl.replace('http://localhost:5000', API_URL);
            }
            
            logos[idEquipo] = logoUrl || null;
            
            // Guardar nombre para búsqueda por voz
            if (equipo.nombre) {
              nombres.push(equipo.nombre);
            }
          } catch (error) {
            console.log(`Error cargando logo del equipo ${idEquipo}:`, error);
            logos[idEquipo] = null;
          }
        })
      );
      
      setEquiposLogos(logos);
      setEquiposNombres(nombres); // Guardar nombres para búsqueda por voz
    } catch (error) {
      console.error('Error cargando logos de equipos:', error);
    }
  };

  const applyFilters = () => {
    let filtered = [...partidos];

    // Filtrar por estado
    if (activeFilter === 'en_juego') {
      filtered = filtered.filter(p => p.estado === 'en_juego');
    } else if (activeFilter === 'programado') {
      filtered = filtered.filter(p => p.estado === 'programado');
    } else if (activeFilter === 'finalizado') {
      filtered = filtered.filter(p => p.estado === 'finalizado');
    }

    // Agrupar por fecha
    filtered.sort((a, b) => {
      const fechaA = new Date(a.fecha_partido || a.fecha_hora || '');
      const fechaB = new Date(b.fecha_partido || b.fecha_hora || '');
      return fechaB.getTime() - fechaA.getTime();
    });

    setFilteredPartidos(filtered);
  };

  const handleVoiceCommand = (text: string) => {
    console.log('🎤 Comando de voz recibido:', text);
    const command = processVoiceCommand(text);
    console.log('🎤 Comando procesado:', command);

    switch (command.action) {
      case 'filter_by_date':
        if (command.params.date) {
          // Filtrar por fecha específica
          const targetDate = command.params.date;
          const filtered = partidos.filter(p => {
            const fechaPartido = new Date(p.fecha_partido || p.fecha_hora || '');
            return isSameDay(fechaPartido, targetDate);
          });
          setFilteredPartidos(filtered);
          Alert.alert('Búsqueda por voz', `Mostrando partidos del ${formatFecha(targetDate.toISOString())}`);
        } else if (command.params.dateRange === 'today') {
          const hoy = new Date();
          const filtered = partidos.filter(p => {
            const fechaPartido = new Date(p.fecha_partido || p.fecha_hora || '');
            return isSameDay(fechaPartido, hoy);
          });
          setFilteredPartidos(filtered);
          setActiveFilter('todos');
          Alert.alert('Búsqueda por voz', 'Mostrando partidos de hoy');
        } else if (command.params.dateRange === 'tomorrow') {
          const mañana = new Date();
          mañana.setDate(mañana.getDate() + 1);
          const filtered = partidos.filter(p => {
            const fechaPartido = new Date(p.fecha_partido || p.fecha_hora || '');
            return isSameDay(fechaPartido, mañana);
          });
          setFilteredPartidos(filtered);
          setActiveFilter('todos');
          Alert.alert('Búsqueda por voz', 'Mostrando partidos de mañana');
        } else if (command.params.dateRange === 'next') {
          // Mostrar próximos partidos
          setActiveFilter('programado');
          Alert.alert('Búsqueda por voz', 'Mostrando próximos partidos');
        } else if (command.params.dateRange === 'previous') {
          // Mostrar partidos anteriores
          setActiveFilter('finalizado');
          Alert.alert('Búsqueda por voz', 'Mostrando partidos finalizados');
        }
        break;

      case 'filter_by_team':
        if (command.params.teamName) {
          const equipoEncontrado = findTeamByName(command.params.teamName, equiposNombres);
          if (equipoEncontrado) {
            const filtered = partidos.filter(p => 
              p.equipo_local.toLowerCase().includes(equipoEncontrado.toLowerCase()) ||
              p.equipo_visitante.toLowerCase().includes(equipoEncontrado.toLowerCase())
            );
            setFilteredPartidos(filtered);
            setActiveFilter('todos');
            Alert.alert('Búsqueda por voz', `Mostrando partidos de ${equipoEncontrado}`);
          } else {
            Alert.alert('No encontrado', `No se encontró el equipo "${command.params.teamName}"`);
          }
        }
        break;

      case 'filter_recent':
        if (command.params.teamName && command.params.count) {
          const equipoEncontrado = findTeamByName(command.params.teamName, equiposNombres);
          if (equipoEncontrado) {
            const filtered = partidos
              .filter(p => 
                p.equipo_local.toLowerCase().includes(equipoEncontrado.toLowerCase()) ||
                p.equipo_visitante.toLowerCase().includes(equipoEncontrado.toLowerCase())
              )
              .sort((a, b) => {
                const fechaA = new Date(a.fecha_partido || a.fecha_hora || '').getTime();
                const fechaB = new Date(b.fecha_partido || b.fecha_hora || '').getTime();
                return fechaB - fechaA; // Más recientes primero
              })
              .slice(0, command.params.count);
            setFilteredPartidos(filtered);
            setActiveFilter('todos');
            Alert.alert('Búsqueda por voz', `Mostrando últimos ${command.params.count} partidos de ${equipoEncontrado}`);
          } else {
            Alert.alert('No encontrado', `No se encontró el equipo "${command.params.teamName}"`);
          }
        }
        break;

      case 'show_all':
        setActiveFilter('todos');
        applyFilters();
        Alert.alert('Búsqueda por voz', 'Mostrando todos los partidos');
        break;

      case 'unknown':
        Alert.alert('Comando no reconocido', `No entendí: "${command.originalText}". Intenta con: "partidos de hoy", "partidos de [equipo]", "mostrar todos"`);
        break;
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadPartidos();
  };

  const handleCampeonatoSelect = (campeonato: Campeonato) => {
    setSelectedCampeonato(campeonato.id_campeonato);
    setShowCampeonatos(false);
    // Los partidos se recargarán automáticamente por el useEffect
  };

  const handleBackToCampeonatos = () => {
    setSelectedCampeonato(null);
    setShowCampeonatos(true);
    setPartidos([]);
    setFilteredPartidos([]);
  };

  const getLogoEquipo = (idEquipo?: number): string | null => {
    if (!idEquipo) return null;
    return equiposLogos[idEquipo] || null;
  };

  const getEstadoBadge = (estado: string) => {
    const badges: Record<string, { text: string; color: string; bg: string }> = {
      en_juego: { text: 'EN VIVO', color: '#FFFFFF', bg: '#D32F2F' },
      programado: { text: 'PRÓXIMO', color: '#1976D2', bg: '#E3F2FD' },
      finalizado: { text: 'FINALIZADO', color: '#616161', bg: '#F5F5F5' },
    };
    return badges[estado] || badges.programado;
  };

  const formatFecha = (fecha: string) => {
    const date = new Date(fecha);
    const hoy = new Date();
    const ayer = new Date(hoy);
    ayer.setDate(ayer.getDate() - 1);

    const dateStr = date.toDateString();
    const hoyStr = hoy.toDateString();
    const ayerStr = ayer.toDateString();

    if (dateStr === hoyStr) {
      return 'HOY';
    } else if (dateStr === ayerStr) {
      return 'AYER';
    } else {
      const dia = date.getDate();
      const meses = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'];
      const mes = meses[date.getMonth()];
      return `${dia} DE ${mes}`;
    }
  };

  const formatHora = (fecha: string) => {
    const date = new Date(fecha);
    return date.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const groupByDate = () => {
    const groups: { [key: string]: Partido[] } = {};
    
    filteredPartidos.forEach(partido => {
      const fecha = partido.fecha_partido || partido.fecha_hora || '';
      const fechaFormateada = formatFecha(fecha);
      
      if (!groups[fechaFormateada]) {
        groups[fechaFormateada] = [];
      }
      groups[fechaFormateada].push(partido);
    });

    return Object.entries(groups).map(([fecha, partidos]) => ({
      fecha,
      partidos,
    }));
  };

  const renderFilterButton = (filter: FilterType, label: string) => (
    <TouchableOpacity
      style={[styles.filterButton, activeFilter === filter && styles.filterButtonActive]}
      onPress={() => setActiveFilter(filter)}
    >
      <Text style={[styles.filterText, activeFilter === filter && styles.filterTextActive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderPartido = (partido: Partido) => (
    <TouchableOpacity
      key={partido.id_partido}
      style={styles.partidoCard}
      onPress={() => onSelectPartido && onSelectPartido(partido.id_partido)}
    >
      <View style={styles.partidoHeader}>
        <Text style={styles.partidoHora}>
          {partido.estado === 'en_juego' 
            ? `${formatHora(partido.fecha_partido || partido.fecha_hora || '')}' EN JUEGO`
            : formatHora(partido.fecha_partido || partido.fecha_hora || '')}
        </Text>
        <View style={[styles.estadoBadge, { backgroundColor: getEstadoBadge(partido.estado).bg }]}>
          {partido.estado === 'en_juego' && <View style={styles.liveDot} />}
          <Text style={[styles.estadoText, { color: getEstadoBadge(partido.estado).color }]}>
            {getEstadoBadge(partido.estado).text}
          </Text>
        </View>
      </View>

      <View style={styles.partidoBody}>
        <View style={styles.equipoContainer}>
          {getLogoEquipo(partido.id_equipo_local) ? (
            <Image 
              source={{ uri: getLogoEquipo(partido.id_equipo_local)! }} 
              style={styles.escudoImage}
              onError={(error) => {
                console.warn('Error cargando logo equipo local:', getLogoEquipo(partido.id_equipo_local));
              }}
            />
          ) : (
          <View style={styles.escudoCircle}>
            <Text style={styles.escudoText}>{partido.equipo_local.charAt(0).toUpperCase()}</Text>
          </View>
          )}
          <Text style={styles.equipoNombre} numberOfLines={1}>
            {partido.equipo_local}
          </Text>
        </View>

        <View style={styles.marcadorContainer}>
          <Text style={styles.marcador}>
            {partido.goles_local ?? '-'} - {partido.goles_visitante ?? '-'}
          </Text>
        </View>

        <View style={styles.equipoContainer}>
          {getLogoEquipo(partido.id_equipo_visitante) ? (
            <Image 
              source={{ uri: getLogoEquipo(partido.id_equipo_visitante)! }} 
              style={styles.escudoImage}
              onError={(error) => {
                console.warn('Error cargando logo equipo visitante:', getLogoEquipo(partido.id_equipo_visitante));
              }}
            />
          ) : (
          <View style={styles.escudoCircle}>
            <Text style={styles.escudoText}>{partido.equipo_visitante.charAt(0).toUpperCase()}</Text>
          </View>
          )}
          <Text style={styles.equipoNombre} numberOfLines={1}>
            {partido.equipo_visitante}
          </Text>
        </View>
      </View>

      {partido.lugar && (
        <Text style={styles.partidoLugar}>📍 {partido.lugar}</Text>
      )}
    </TouchableOpacity>
  );

  const renderGroup = ({ item }: { item: { fecha: string; partidos: Partido[] } }) => (
    <View>
      <View style={styles.dateHeader}>
        <Text style={styles.dateHeaderText}>{item.fecha}</Text>
      </View>
      {item.partidos.map(partido => renderPartido(partido))}
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const renderCampeonato = (campeonato: Campeonato) => {
    // Corregir URL del logo si usa localhost
    let logoUrl = campeonato.logo_url;
    if (logoUrl && logoUrl.includes('localhost')) {
      logoUrl = logoUrl.replace('http://localhost:5000', API_URL);
    }
    
    return (
      <TouchableOpacity
        key={campeonato.id_campeonato}
        style={styles.campeonatoCard}
        onPress={() => handleCampeonatoSelect(campeonato)}
        activeOpacity={0.8}
      >
        <View style={styles.campeonatoCardContent}>
          {/* Logo del campeonato */}
          <View style={styles.campeonatoLogoContainer}>
            {logoUrl ? (
              <Image 
                source={{ uri: logoUrl }} 
                style={styles.campeonatoLogo}
                onError={(error) => {
                  console.warn('Error cargando logo del campeonato:', logoUrl);
                }}
              />
            ) : (
              <View style={styles.campeonatoLogoPlaceholder}>
                <Text style={styles.campeonatoLogoText}>
                  {campeonato.nombre.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </View>

          {/* Información del campeonato */}
          <View style={styles.campeonatoInfo}>
            <Text style={styles.campeonatoNombre} numberOfLines={2}>
              {campeonato.nombre}
            </Text>
            <View style={styles.campeonatoBadge}>
              <Text style={styles.campeonatoEstado}>
                {campeonato.estado === 'en_curso' ? 'En Curso' : 
                 campeonato.estado === 'planificacion' ? 'Planificación' : 
                 campeonato.estado === 'finalizado' ? 'Finalizado' : campeonato.estado}
              </Text>
            </View>
            {(campeonato.total_partidos !== undefined || campeonato.total_equipos_inscritos !== undefined) && (
              <View style={styles.campeonatoStats}>
                {campeonato.total_partidos !== undefined && (
                  <Text style={styles.campeonatoStat}>
                    ⚽ {campeonato.total_partidos} partidos
                  </Text>
                )}
                {campeonato.total_equipos_inscritos !== undefined && (
                  <Text style={styles.campeonatoStat}>
                    👥 {campeonato.total_equipos_inscritos} equipos
                  </Text>
                )}
              </View>
            )}
          </View>

          {/* Flecha */}
          <Text style={styles.campeonatoArrow}>→</Text>
        </View>
      </TouchableOpacity>
    );
  };

  const groupedPartidos = groupByDate();

  // Vista de campeonatos
  if (showCampeonatos) {
    return (
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Selecciona un Campeonato</Text>
        </View>

        {/* Lista de campeonatos */}
        {loadingCampeonatos ? (
          <View style={[styles.container, styles.centerContent]}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : campeonatos.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>🏆</Text>
            <Text style={styles.emptyTitle}>No hay campeonatos</Text>
            <Text style={styles.emptyText}>No se encontraron campeonatos disponibles</Text>
          </View>
        ) : (
          <FlatList
            data={campeonatos}
            keyExtractor={(item) => item.id_campeonato.toString()}
            renderItem={({ item }) => renderCampeonato(item)}
            contentContainerStyle={styles.listContainer}
            refreshControl={
              <RefreshControl 
                refreshing={refreshing} 
                onRefresh={() => {
                  setRefreshing(true);
                  loadCampeonatos().finally(() => {
                    setRefreshing(false);
                  });
                }} 
                colors={[colors.primary]} 
              />
            }
          />
        )}
      </View>
    );
  }

  // Vista de partidos del campeonato seleccionado
  return (
    <View style={styles.container}>
      {/* Header con botón de volver y búsqueda por voz */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackToCampeonatos}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {campeonatos.find(c => c.id_campeonato === selectedCampeonato)?.nombre || 'Partidos'}
        </Text>
        <VoiceSearchButton 
          onCommandReceived={handleVoiceCommand}
          disabled={loading || partidos.length === 0}
        />
      </View>

      {/* Filtros por Estado */}
      <View style={styles.filtersContainer}>
        {renderFilterButton('todos', 'Todos')}
        {renderFilterButton('en_juego', 'En vivo')}
        {renderFilterButton('programado', 'Próximos')}
        {renderFilterButton('finalizado', 'Finalizados')}
      </View>

      {/* Lista de partidos */}
      {loading ? (
        <View style={[styles.container, styles.centerContent]}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : groupedPartidos.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>⚽</Text>
          <Text style={styles.emptyTitle}>No hay partidos</Text>
          <Text style={styles.emptyText}>No se encontraron partidos en este campeonato</Text>
        </View>
      ) : (
        <FlatList
          data={groupedPartidos}
          keyExtractor={(item) => item.fecha}
          renderItem={renderGroup}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
          }
        />
      )}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingVertical: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212121',
  },
  calendarButton: {
    padding: 8,
  },
  calendarIcon: {
    fontSize: 24,
  },
  filtersContainer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginTop: 16,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#616161',
  },
  filterTextActive: {
    color: '#FFFFFF',
  },
  listContainer: {
    padding: 24,
  },
  dateHeader: {
    marginBottom: 12,
    marginTop: 8,
  },
  dateHeaderText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212121',
  },
  partidoCard: {
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
  partidoHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  partidoHora: {
    fontSize: 14,
    color: '#616161',
    fontWeight: '600',
  },
  estadoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFFFFF',
  },
  estadoText: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  partidoBody: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  equipoContainer: {
    flex: 1,
    alignItems: 'center',
  },
  escudoCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  escudoImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  escudoText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  equipoNombre: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212121',
    textAlign: 'center',
  },
  marcadorContainer: {
    paddingHorizontal: 16,
  },
  marcador: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#212121',
  },
  partidoLugar: {
    fontSize: 12,
    color: '#757575',
    marginTop: 8,
    textAlign: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212121',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#757575',
    textAlign: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 28,
    color: '#212121',
    fontWeight: 'bold',
  },
  campeonatoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  campeonatoCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  campeonatoLogoContainer: {
    width: 80,
    height: 80,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#F5F5F5',
  },
  campeonatoLogo: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  campeonatoLogoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  campeonatoLogoText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  campeonatoInfo: {
    flex: 1,
  },
  campeonatoNombre: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212121',
    marginBottom: 8,
  },
  campeonatoBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary + '20',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  campeonatoEstado: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  campeonatoStats: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 4,
  },
  campeonatoStat: {
    fontSize: 12,
    color: '#757575',
    fontWeight: '500',
  },
  campeonatoArrow: {
    fontSize: 24,
    color: '#757575',
    marginLeft: 'auto',
  },
});