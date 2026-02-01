import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
  Dimensions,
  FlatList,
  Animated,
  Easing,
  Alert,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import axios from 'axios';
import { colors } from '../theme/colors';
import { API_BASE_URL, API_TIMEOUT } from '../utils/constants';
import { VoiceSearchButton } from '../components/VoiceSearchButton';
import { processVoiceCommand, findTeamByName, isSameDay } from '../utils/voiceCommandProcessor';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 48;
const API_URL = API_BASE_URL; // ✅ USAR LA CONSTANTE

// Configurar timeout
axios.defaults.timeout = API_TIMEOUT; // ✅ USAR EL TIMEOUT DE CONSTANTS

interface Campeonato {
  id_campeonato: number;
  nombre: string;
  descripcion: string;
  fecha_inicio: string;
  fecha_fin: string;
  tipo_deporte: string;
  tipo_competicion: string;
  estado: string;
  total_equipos_inscritos?: number;
  max_equipos?: number;
  logo_url?: string;
}

interface Partido {
  id_partido: number;
  id_campeonato?: number;
  id_equipo_local?: number;
  id_equipo_visitante?: number;
  equipo_local: string;
  equipo_visitante: string;
  goles_local: number | null;
  goles_visitante: number | null;
  fecha_hora?: string;
  fecha_partido?: string;
  estado: string;
  lugar: string;
  jornada?: number;
}

interface EquipoLogo {
  [key: number]: string | null;
}

interface Posicion {
  posicion: number;
  id_equipo: number;
  equipo: string;
  nombre?: string;
  logo_url?: string;
  partidos_jugados: number;
  ganados?: number;
  empatados?: number;
  perdidos?: number;
  goles_favor: number;
  goles_contra: number;
  diferencia_goles?: number;
  puntos: number;
}

type CategoryFilter = 'todos' | 'futbol' | 'indoor' | 'en_curso';

interface HomeScreenProps {
  onNavigateToCampeonato?: (id: number) => void;
  onNavigateToPartido?: (id: number) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  onNavigateToCampeonato,
  onNavigateToPartido,
}) => {
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [campeonatos, setCampeonatos] = useState<Campeonato[]>([]);
  const [campeonatosFiltrados, setCampeonatosFiltrados] = useState<Campeonato[]>([]);
  const [misCampeonatos, setMisCampeonatos] = useState<Campeonato[]>([]);
  const [partidosDestacados, setPartidosDestacados] = useState<Partido[]>([]);
  const [proximosPartidos, setProximosPartidos] = useState<Partido[]>([]);
  const [tabla, setTabla] = useState<Posicion[]>([]);
  const [equiposLogos, setEquiposLogos] = useState<EquipoLogo>({});
  const [equiposNombres, setEquiposNombres] = useState<string[]>([]); // Para búsqueda por voz
  
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('todos');
  const [selectedCampeonato, setSelectedCampeonato] = useState<number | null>(null);

  // Animaciones
  const pulseAnim = useState(new Animated.Value(1))[0];
  const [cardScales] = useState(() => 
    Array(10).fill(0).map(() => new Animated.Value(1))
  );

  useEffect(() => {
    loadData();
    startPulseAnimation();
  }, []);

  useEffect(() => {
    aplicarFiltroCategoria();
  }, [selectedCategory, campeonatos]);

  // Animación de pulso para "EN VIVO"
  const startPulseAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const aplicarFiltroCategoria = () => {
    let filtrados = [...campeonatos];

    switch (selectedCategory) {
      case 'futbol':
        filtrados = filtrados.filter(c => c.tipo_deporte === 'futbol');
        break;
      case 'indoor':
        filtrados = filtrados.filter(c => c.tipo_deporte === 'indoor');
        break;
      case 'en_curso':
        filtrados = filtrados.filter(c => c.estado === 'en_curso');
        break;
      case 'todos':
      default:
        // Todos los campeonatos
        break;
    }

    setCampeonatosFiltrados(filtrados);
    setMisCampeonatos(filtrados.slice(0, 4));
  };

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      // 1. Cargar campeonatos
      const campRes = await axios.get(`${API_URL}/campeonatos`);
      const campeonatosData = campRes.data.campeonatos || campRes.data;
      
      // Filtrar activos
      const campActivos = campeonatosData.filter(
        (c: Campeonato) => c.estado === 'en_curso' || c.estado === 'planificacion'
      );
      
      setCampeonatos(campActivos);
      setCampeonatosFiltrados(campActivos);
      setMisCampeonatos(campActivos.slice(0, 4));

      // 2. Cargar TODOS los partidos
      try {
        const partidosRes = await axios.get(`${API_URL}/partidos`);
        const partidosData = partidosRes.data.data?.partidos || 
                            partidosRes.data.partidos || 
                            partidosRes.data || [];

        // Partidos destacados (EN VIVO o más recientes)
        const enVivo = partidosData.filter((p: Partido) => p.estado === 'en_juego');
        const finalizados = partidosData.filter((p: Partido) => p.estado === 'finalizado');
        const destacados = [...enVivo, ...finalizados.slice(0, 3)].slice(0, 3);
        setPartidosDestacados(destacados);

        // Próximos partidos (programados)
        const programados = partidosData
          .filter((p: Partido) => p.estado === 'programado')
          .sort((a: Partido, b: Partido) => {
            const fechaA = new Date(a.fecha_partido || a.fecha_hora || '');
            const fechaB = new Date(b.fecha_partido || b.fecha_hora || '');
            return fechaA.getTime() - fechaB.getTime();
          })
          .slice(0, 3);
        setProximosPartidos(programados);

        // Cargar logos de los equipos de los partidos
        await loadEquiposLogos([...destacados, ...programados]);
      } catch (error) {
        console.log('Error cargando partidos:', error);
      }

      // 3. Cargar tabla del primer campeonato
      if (campActivos.length > 0) {
        const primerCamp = campActivos[0];
        setSelectedCampeonato(primerCamp.id_campeonato);
        await loadTabla(primerCamp.id_campeonato);
      }

    } catch (error) {
      console.error('Error cargando datos:', error);
      if (axios.isAxiosError(error)) {
        setError(`Error de conexión: ${error.message}`);
      } else {
        setError('Error desconocido');
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadTabla = async (idCampeonato: number) => {
    try {
      const tablaRes = await axios.get(`${API_URL}/estadisticas/tabla-posiciones`, {
        params: { id_campeonato: idCampeonato }
      });
      
      const tablaData = tablaRes.data.tabla_posiciones || [];
      const tablaNormalizada = tablaData.map((item: any) => ({
        ...item,
        equipo: item.equipo || item.nombre
      }));
      
      setTabla(tablaNormalizada.slice(0, 3));
    } catch (error) {
      console.log('Error cargando tabla:', error);
      setTabla([]);
    }
  };

  const loadEquiposLogos = async (partidos: Partido[]) => {
    try {
      // Obtener IDs únicos de equipos
      const equiposIds = new Set<number>();
      partidos.forEach(partido => {
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
      
      setEquiposLogos(prev => ({ ...prev, ...logos }));
    } catch (error) {
      console.error('Error cargando logos de equipos:', error);
    }
  };

  const getLogoEquipo = (idEquipo?: number): string | null => {
    if (!idEquipo) return null;
    return equiposLogos[idEquipo] || null;
  };

  const handleVoiceCommand = (text: string) => {
    console.log('🎤 Comando de voz recibido en Home:', text);
    const command = processVoiceCommand(text);
    console.log('🎤 Comando procesado:', command);

    switch (command.action) {
      case 'filter_by_date':
        if (command.params.dateRange === 'today') {
          // Filtrar partidos de hoy
          const hoy = new Date();
          const partidosHoy = [...partidosDestacados, ...proximosPartidos].filter(p => {
            const fechaPartido = new Date(p.fecha_partido || p.fecha_hora || '');
            return isSameDay(fechaPartido, hoy);
          });
          if (partidosHoy.length > 0) {
            setPartidosDestacados(partidosHoy.slice(0, 5));
            Alert.alert('Búsqueda por voz', `Mostrando ${partidosHoy.length} partidos de hoy`);
          } else {
            Alert.alert('Sin resultados', 'No hay partidos programados para hoy');
          }
        } else if (command.params.dateRange === 'tomorrow') {
          const mañana = new Date();
          mañana.setDate(mañana.getDate() + 1);
          const partidosManana = [...partidosDestacados, ...proximosPartidos].filter(p => {
            const fechaPartido = new Date(p.fecha_partido || p.fecha_hora || '');
            return isSameDay(fechaPartido, mañana);
          });
          if (partidosManana.length > 0) {
            setProximosPartidos(partidosManana.slice(0, 5));
            Alert.alert('Búsqueda por voz', `Mostrando ${partidosManana.length} partidos de mañana`);
          } else {
            Alert.alert('Sin resultados', 'No hay partidos programados para mañana');
          }
        }
        break;

      case 'filter_by_team':
        if (command.params.teamName) {
          const equipoEncontrado = findTeamByName(command.params.teamName, equiposNombres);
          if (equipoEncontrado) {
            // Filtrar partidos del equipo
            const partidosEquipo = [...partidosDestacados, ...proximosPartidos].filter(p => 
              p.equipo_local.toLowerCase().includes(equipoEncontrado.toLowerCase()) ||
              p.equipo_visitante.toLowerCase().includes(equipoEncontrado.toLowerCase())
            );
            if (partidosEquipo.length > 0) {
              setPartidosDestacados(partidosEquipo.slice(0, 5));
              Alert.alert('Búsqueda por voz', `Mostrando ${partidosEquipo.length} partidos de ${equipoEncontrado}`);
            } else {
              Alert.alert('Sin resultados', `No se encontraron partidos para ${equipoEncontrado}`);
            }
          } else {
            Alert.alert('No encontrado', `No se encontró el equipo "${command.params.teamName}"`);
          }
        }
        break;

      case 'show_all':
        // Recargar todos los datos
        loadData();
        Alert.alert('Búsqueda por voz', 'Mostrando todos los campeonatos y partidos');
        break;

      case 'unknown':
        // Intentar buscar por nombre de campeonato
        const lowerText = text.toLowerCase();
        const campeonatoEncontrado = campeonatos.find(c => 
          c.nombre.toLowerCase().includes(lowerText) || 
          lowerText.includes(c.nombre.toLowerCase())
        );
        if (campeonatoEncontrado) {
          setSelectedCategory('todos');
          setCampeonatosFiltrados([campeonatoEncontrado]);
          Alert.alert('Búsqueda por voz', `Mostrando campeonato: ${campeonatoEncontrado.nombre}`);
        } else {
          Alert.alert('Comando no reconocido', `No entendí: "${command.originalText}". Intenta con: "partidos de hoy", "partidos de [equipo]", "mostrar todos"`);
        }
        break;
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const animateCard = (index: number) => {
    Animated.sequence([
      Animated.timing(cardScales[index], {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(cardScales[index], {
        toValue: 1,
        friction: 3,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleCampeonatoPress = (id: number, index: number) => {
    animateCard(index);
    setTimeout(() => {
      if (onNavigateToCampeonato) {
        onNavigateToCampeonato(id);
      }
    }, 150);
  };

  const handlePartidoPress = (id: number, index: number) => {
    animateCard(index);
    setTimeout(() => {
      if (onNavigateToPartido) {
        onNavigateToPartido(id);
      }
    }, 150);
  };

  const formatFecha = (fecha: string) => {
    const date = new Date(fecha);
    const dia = date.getDate();
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const mes = meses[date.getMonth()];
    return `${dia} ${mes}`;
  };

  const formatHora = (fecha: string) => {
    const date = new Date(fecha);
    const horas = date.getHours();
    const minutos = date.getMinutes().toString().padStart(2, '0');
    return `${horas}:${minutos}`;
  };

  const getDia = (fecha: string) => {
    const date = new Date(fecha);
    const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    return dias[date.getDay()];
  };

  const getCategoryLabel = (category: CategoryFilter) => {
    switch (category) {
      case 'todos': return 'Liga Local';
      case 'futbol': return 'Fútbol Campo';
      case 'indoor': return 'Fútbol Sala';
      case 'en_curso': return 'En Curso';
      default: return 'Todos';
    }
  };

  const renderCategoryChip = (category: CategoryFilter) => (
    <TouchableOpacity
      key={category}
      style={[
        styles.categoryChip,
        selectedCategory === category && styles.categoryChipActive
      ]}
      onPress={() => setSelectedCategory(category)}
      activeOpacity={0.7}
    >
      <Text style={[
        styles.categoryChipText,
        selectedCategory === category && styles.categoryChipTextActive
      ]}>
        {getCategoryLabel(category)}
      </Text>
    </TouchableOpacity>
  );

  const renderPartidoDestacado = ({ item, index }: { item: Partido; index: number }) => (
    <Animated.View style={{ transform: [{ scale: cardScales[index] }] }}>
      <TouchableOpacity 
        style={styles.featuredCard}
        onPress={() => handlePartidoPress(item.id_partido, index)}
        activeOpacity={0.9}
      >
        {/* Header con estado */}
        <View style={styles.featuredHeader}>
          <Text style={styles.featuredLeague}>
            {item.jornada ? `Jornada ${item.jornada}` : 'Liga Local'}
          </Text>
          {item.estado === 'en_juego' && (
            <View style={styles.liveBadge}>
              <Animated.View 
                style={[
                  styles.liveDot,
                  { transform: [{ scale: pulseAnim }] }
                ]} 
              />
              <Text style={styles.liveText}>EN VIVO</Text>
            </View>
          )}
          {item.estado === 'finalizado' && (
            <View style={styles.finalizadoBadge}>
              <Text style={styles.finalizadoText}>FINALIZADO</Text>
            </View>
          )}
        </View>

        {/* Marcador */}
        <View style={styles.featuredMatch}>
          <View style={styles.featuredTeam}>
            {getLogoEquipo(item.id_equipo_local) ? (
              <Image 
                source={{ uri: getLogoEquipo(item.id_equipo_local)! }} 
                style={styles.featuredShieldImage}
                onError={(error) => {
                  console.warn('Error cargando logo equipo local:', getLogoEquipo(item.id_equipo_local));
                }}
              />
            ) : (
            <View style={styles.featuredShield}>
              <Text style={styles.featuredShieldText}>
                {item.equipo_local.charAt(0).toUpperCase()}
              </Text>
            </View>
            )}
            <Text style={styles.featuredTeamName} numberOfLines={1}>
              {item.equipo_local}
            </Text>
          </View>

          <View style={styles.featuredScore}>
            <Text style={styles.featuredScoreText}>
              {item.goles_local ?? 0}
            </Text>
            <Text style={styles.featuredVs}>-</Text>
            <Text style={styles.featuredScoreText}>
              {item.goles_visitante ?? 0}
            </Text>
          </View>

          <View style={styles.featuredTeam}>
            {getLogoEquipo(item.id_equipo_visitante) ? (
              <Image 
                source={{ uri: getLogoEquipo(item.id_equipo_visitante)! }} 
                style={styles.featuredShieldImage}
                onError={(error) => {
                  console.warn('Error cargando logo equipo visitante:', getLogoEquipo(item.id_equipo_visitante));
                }}
              />
            ) : (
            <View style={styles.featuredShield}>
              <Text style={styles.featuredShieldText}>
                {item.equipo_visitante.charAt(0).toUpperCase()}
              </Text>
            </View>
            )}
            <Text style={styles.featuredTeamName} numberOfLines={1}>
              {item.equipo_visitante}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );

  const renderMiCampeonato = ({ item, index }: { item: Campeonato; index: number }) => (
    <Animated.View style={{ transform: [{ scale: cardScales[index + 3] }] }}>
      <TouchableOpacity 
        style={styles.campeonatoCard}
        onPress={() => handleCampeonatoPress(item.id_campeonato, index + 3)}
        activeOpacity={0.9}
      >
        <View style={styles.campeonatoImageContainer}>
          {item.logo_url ? (
            <Image 
              source={{ uri: item.logo_url }} 
              style={styles.campeonatoImage}
            />
          ) : (
            <View style={styles.campeonatoPlaceholder}>
              <Text style={styles.campeonatoPlaceholderIcon}>⚽</Text>
            </View>
          )}
        </View>
        <Text style={styles.campeonatoNombre} numberOfLines={2}>
          {item.nombre}
        </Text>
        <Text style={[
          styles.campeonatoEstado,
          item.estado === 'en_curso' && styles.campeonatoEstadoActivo,
          item.estado === 'planificacion' && styles.campeonatoEstadoPlanificacion,
          item.estado === 'finalizado' && styles.campeonatoEstadoFinalizado
        ]}>
          {item.estado === 'en_curso' ? 'EN PROGRESO' : 
           item.estado === 'planificacion' ? 'PLANIFICACIÓN' : 
           item.estado === 'finalizado' ? 'FINALIZADO' : 
           item.estado.toUpperCase()}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Cargando datos...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadData}>
          <Text style={styles.retryButtonText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl 
            refreshing={refreshing} 
            onRefresh={onRefresh} 
            colors={[colors.primary]}
            tintColor={colors.primary}
            title="Actualizando..."
            titleColor={colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* ===== HEADER ===== */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>A</Text>
            </View>
            <View>
              <Text style={styles.greeting}>Hola, Aficionado</Text>
            </View>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity style={styles.headerIcon} activeOpacity={0.7}>
              <Text style={styles.iconEmoji}>🔍</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerIcon} activeOpacity={0.7}>
              <Text style={styles.iconEmoji}>🔔</Text>
              <View style={styles.notificationDot} />
            </TouchableOpacity>
            <VoiceSearchButton 
              onCommandReceived={handleVoiceCommand}
              disabled={loading}
            />
          </View>
        </View>

        {/* ===== CATEGORY CHIPS ===== */}
        <View style={styles.categoryContainer}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryScroll}
          >
            {(['todos', 'futbol', 'indoor', 'en_curso'] as CategoryFilter[]).map(cat => 
              renderCategoryChip(cat)
            )}
          </ScrollView>
        </View>

        {/* ===== PARTIDOS DESTACADOS ===== */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Partidos Destacados</Text>
            {partidosDestacados.some(p => p.estado === 'en_juego') && (
              <View style={styles.liveIndicator}>
                <Animated.View 
                  style={[
                    styles.livePulse,
                    { transform: [{ scale: pulseAnim }] }
                  ]} 
                />
                <Text style={styles.liveLabel}>EN VIVO</Text>
              </View>
            )}
          </View>

          {partidosDestacados.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>⚽</Text>
              <Text style={styles.emptyText}>No hay partidos destacados</Text>
            </View>
          ) : (
            <FlatList
              horizontal
              data={partidosDestacados}
              renderItem={renderPartidoDestacado}
              keyExtractor={(item) => item.id_partido.toString()}
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.featuredList}
            />
          )}
        </View>

        {/* ===== MIS CAMPEONATOS ===== */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Mis Campeonatos</Text>
            <TouchableOpacity activeOpacity={0.7}>
              <Text style={styles.seeAll}>Ver todos</Text>
            </TouchableOpacity>
          </View>

          {misCampeonatos.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>🏆</Text>
              <Text style={styles.emptyText}>
                {selectedCategory === 'todos' 
                  ? 'No hay campeonatos activos'
                  : `No hay campeonatos de ${getCategoryLabel(selectedCategory)}`
                }
              </Text>
            </View>
          ) : (
            <FlatList
              data={misCampeonatos}
              renderItem={renderMiCampeonato}
              keyExtractor={(item) => item.id_campeonato.toString()}
              numColumns={2}
              scrollEnabled={false}
              columnWrapperStyle={styles.campeonatosGrid}
            />
          )}
        </View>

        {/* ===== TABLA DE POSICIONES ===== */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Tabla de Posiciones</Text>
            {tabla.length > 0 && (
              <TouchableOpacity activeOpacity={0.7}>
                <Text style={styles.seeAll}>Ver completa</Text>
              </TouchableOpacity>
            )}
          </View>

          {tabla.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>📊</Text>
              <Text style={styles.emptyText}>No hay tabla disponible</Text>
            </View>
          ) : (
            <View style={styles.tablaCard}>
              {/* Header */}
              <View style={styles.tablaHeader}>
                <Text style={[styles.tablaHeaderText, { width: 40 }]}>#</Text>
                <Text style={[styles.tablaHeaderText, { flex: 1 }]}>Equipo</Text>
                <Text style={[styles.tablaHeaderText, { width: 50 }]}>PJ</Text>
                <Text style={[styles.tablaHeaderText, { width: 50 }]}>PTS</Text>
              </View>

              {/* Rows */}
              {tabla.map((item, index) => (
                <TouchableOpacity 
                  key={index} 
                  style={styles.tablaRow}
                  activeOpacity={0.7}
                >
                  <View style={[styles.posicionContainer, { width: 40 }]}>
                    <View style={[
                      styles.posicionBadge,
                      item.posicion <= 3 && styles.posicionTop
                    ]}>
                      <Text style={[
                        styles.posicionText,
                        item.posicion <= 3 && styles.posicionTextTop
                      ]}>
                        {item.posicion}
                      </Text>
                    </View>
                  </View>

                  <View style={[styles.equipoContainer, { flex: 1 }]}>
                    <View style={styles.escudoMini}>
                      {item.logo_url ? (
                        <Image 
                          source={{ uri: item.logo_url }} 
                          style={styles.escudoMiniImage}
                        />
                      ) : (
                        <Text style={styles.escudoMiniText}>
                          {item.equipo.charAt(0).toUpperCase()}
                        </Text>
                      )}
                    </View>
                    <Text style={styles.equipoNombre} numberOfLines={1}>
                      {item.equipo}
                    </Text>
                    {item.posicion <= 3 && (
                      <Text style={[
                        styles.trendIcon,
                        item.posicion === 1 && styles.trendUp
                      ]}>
                        {item.posicion === 1 ? '↑' : '−'}
                      </Text>
                    )}
                  </View>

                  <Text style={[styles.tablaValue, { width: 50 }]}>
                    {item.partidos_jugados}
                  </Text>
                  <Text style={[styles.tablaValueDestacado, { width: 50 }]}>
                    {item.puntos}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* ===== PRÓXIMOS PARTIDOS ===== */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Próximos Partidos</Text>
            {proximosPartidos.length > 0 && (
              <Text style={styles.sectionSubtitle}>
                {getDia(proximosPartidos[0].fecha_partido || proximosPartidos[0].fecha_hora || '')}, {formatFecha(proximosPartidos[0].fecha_partido || proximosPartidos[0].fecha_hora || '')}
              </Text>
            )}
          </View>

          {proximosPartidos.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyIcon}>📅</Text>
              <Text style={styles.emptyText}>No hay próximos partidos</Text>
            </View>
          ) : (
            proximosPartidos.map((partido, index) => (
              <TouchableOpacity 
                key={partido.id_partido} 
                style={styles.proximoCard}
                onPress={() => handlePartidoPress(partido.id_partido, index + 7)}
                activeOpacity={0.9}
              >
                <View style={styles.proximoTime}>
                  <Text style={styles.proximoHora}>
                    {formatHora(partido.fecha_partido || partido.fecha_hora || '')}
                  </Text>
                  <Text style={styles.proximoLabel}>
                    {parseInt(formatHora(partido.fecha_partido || partido.fecha_hora || '').split(':')[0]) >= 12 ? 'PM' : 'AM'}
                  </Text>
                </View>

                <View style={styles.proximoDivider} />

                <View style={styles.proximoMatch}>
                  <View style={styles.proximoTeamRow}>
                    {getLogoEquipo(partido.id_equipo_local) ? (
                      <Image 
                        source={{ uri: getLogoEquipo(partido.id_equipo_local)! }} 
                        style={styles.escudoSmallImage}
                        onError={(error) => {
                          console.warn('Error cargando logo equipo local:', getLogoEquipo(partido.id_equipo_local));
                        }}
                      />
                    ) : (
                    <View style={styles.escudoSmall}>
                      <Text style={styles.escudoSmallText}>
                        {partido.equipo_local.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    )}
                    <Text style={styles.proximoTeamName} numberOfLines={1}>
                      {partido.equipo_local}
                    </Text>
                  </View>

                  <View style={styles.proximoTeamRow}>
                    {getLogoEquipo(partido.id_equipo_visitante) ? (
                      <Image 
                        source={{ uri: getLogoEquipo(partido.id_equipo_visitante)! }} 
                        style={styles.escudoSmallImage}
                        onError={(error) => {
                          console.warn('Error cargando logo equipo visitante:', getLogoEquipo(partido.id_equipo_visitante));
                        }}
                      />
                    ) : (
                    <View style={styles.escudoSmall}>
                      <Text style={styles.escudoSmallText}>
                        {partido.equipo_visitante.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                    )}
                    <Text style={styles.proximoTeamName} numberOfLines={1}>
                      {partido.equipo_visitante}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity 
                  style={styles.notifyButton}
                  onPress={(e) => {
                    e.stopPropagation();
                    // Aquí agregar lógica de notificación
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.notifyIcon}>🔔</Text>
                </TouchableOpacity>
              </TouchableOpacity>
            ))
          )}
        </View>

        {/* FAB Spacing */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ===== FAB ===== */}
      <TouchableOpacity 
        style={styles.fab}
        activeOpacity={0.8}
        onPress={() => {
          // Aquí agregar lógica del FAB (búsqueda por voz, etc)
        }}
      >
        <Text style={styles.fabIcon}>🎤</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F8F6',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#757575',
    fontWeight: '500',
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  errorText: {
    fontSize: 16,
    color: '#D32F2F',
    textAlign: 'center',
    paddingHorizontal: 32,
    marginBottom: 24,
  },
  retryButton: {
    paddingHorizontal: 32,
    paddingVertical: 12,
    backgroundColor: colors.primary,
    borderRadius: 24,
    elevation: 3,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },

  // ===== HEADER =====
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(246, 248, 246, 0.95)',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  greeting: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111811',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerIcon: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  iconEmoji: {
    fontSize: 24,
  },
  notificationDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF5252',
    borderWidth: 2,
    borderColor: '#F6F8F6',
  },

  // ===== CATEGORY CHIPS =====
  categoryContainer: {
    paddingVertical: 16,
  },
  categoryScroll: {
    paddingHorizontal: 16,
    gap: 12,
  },
  categoryChip: {
    height: 36,
    paddingHorizontal: 20,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  categoryChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    elevation: 3,
    shadowOpacity: 0.2,
  },
  categoryChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#616161',
  },
  categoryChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },

  // ===== SECTION =====
  section: {
    marginTop: 8,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111811',
  },
  sectionSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    color: '#757575',
  },
  seeAll: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  livePulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF5252',
  },
  liveLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FF5252',
  },

  // ===== FEATURED CARDS =====
  featuredList: {
    gap: 16,
  },
  featuredCard: {
    width: 280,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  featuredHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  featuredLeague: {
    fontSize: 12,
    fontWeight: '600',
    color: '#757575',
    textTransform: 'uppercase',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FFE5E5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF5252',
  },
  liveText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#FF5252',
  },
  finalizadoBadge: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  finalizadoText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#757575',
  },
  featuredMatch: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  featuredTeam: {
    flex: 1,
    alignItems: 'center',
  },
  featuredShield: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  featuredShieldImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  featuredShieldText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
  },
  featuredTeamName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212121',
    textAlign: 'center',
  },
  featuredScore: {
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  featuredScoreText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#111811',
  },
  featuredVs: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#BDBDBD',
  },

  // ===== MIS CAMPEONATOS =====
  campeonatosGrid: {
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  campeonatoCard: {
    width: (width - 48) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  campeonatoImageContainer: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 12,
  },
  campeonatoImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  campeonatoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  campeonatoPlaceholderIcon: {
    fontSize: 40,
  },
  campeonatoNombre: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#212121',
    marginBottom: 4,
    minHeight: 36,
  },
  campeonatoEstado: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FF6F00',
    textTransform: 'uppercase',
  },
  campeonatoEstadoActivo: {
    color: colors.primary,
  },
  campeonatoEstadoPlanificacion: {
    color: '#FF6F00',
  },
  campeonatoEstadoFinalizado: {
    color: '#757575',
  },

  // ===== TABLA =====
  tablaCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  tablaHeader: {
    flexDirection: 'row',
    backgroundColor: 'rgba(47, 127, 52, 0.1)',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  tablaHeaderText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.primary,
    textTransform: 'uppercase',
    textAlign: 'center',
  },
  tablaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  posicionContainer: {
    alignItems: 'center',
  },
  posicionBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  posicionTop: {
    backgroundColor: colors.primary,
  },
  posicionText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#757575',
  },
  posicionTextTop: {
    color: '#FFFFFF',
  },
  equipoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  escudoMini: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  escudoMiniImage: {
    width: 32,
    height: 32,
    resizeMode: 'cover',
  },
  escudoMiniText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.primary,
  },
  equipoNombre: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212121',
    flex: 1,
  },
  trendIcon: {
    fontSize: 16,
    color: '#BDBDBD',
    fontWeight: 'bold',
  },
  trendUp: {
    color: '#4CAF50',
  },
  tablaValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#616161',
    textAlign: 'center',
  },
  tablaValueDestacado: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#212121',
    textAlign: 'center',
  },

  // ===== PRÓXIMOS PARTIDOS =====
  proximoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  proximoTime: {
    alignItems: 'center',
  },
  proximoHora: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#212121',
  },
  proximoLabel: {
    fontSize: 10,
    color: '#9E9E9E',
  },
  proximoDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 16,
  },
  proximoMatch: {
    flex: 1,
    gap: 4,
  },
  proximoTeamRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  escudoSmall: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  escudoSmallImage: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  escudoSmallText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.primary,
  },
  proximoTeamName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#212121',
    flex: 1,
  },
  notifyButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(47, 127, 52, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  notifyIcon: {
    fontSize: 20,
  },

  // ===== EMPTY STATE =====
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#757575',
    textAlign: 'center',
  },

  // ===== FAB =====
  fab: {
    position: 'absolute',
    bottom: 96,
    right: 24,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FF6F00',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#FF6F00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  fabIcon: {
    fontSize: 32,
  },
});




