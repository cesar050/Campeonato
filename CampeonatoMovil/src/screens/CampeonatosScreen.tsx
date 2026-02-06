import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Image,
  Animated,
} from 'react-native';
import axios from 'axios';
import { colors } from '../theme/colors';
import { API_BASE_URL, API_TIMEOUT } from '../utils/constants';

const API_URL = API_BASE_URL;

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

type FilterType = 'todos' | 'futbol' | 'indoor' | 'en_curso' | 'finalizado';

interface Props {
  onSelectCampeonato?: (id: number) => void;
}

export const CampeonatosScreen: React.FC<Props> = ({ onSelectCampeonato }) => {
  const [campeonatos, setCampeonatos] = useState<Campeonato[]>([]);
  const [filteredCampeonatos, setFilteredCampeonatos] = useState<Campeonato[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterType>('todos');
  const [favoritos, setFavoritos] = useState<Set<number>>(new Set());

  // Animaciones
  const [cardScales] = useState(() => 
    Array(20).fill(0).map(() => new Animated.Value(1))
  );

  useEffect(() => {
    loadCampeonatos();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [campeonatos, activeFilter, searchQuery]);

  const loadCampeonatos = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/campeonatos`, {
        timeout: API_TIMEOUT,
      });
      const data = response.data.campeonatos || response.data;
      
      console.log('✅ Campeonatos cargados:', data.length);
      setCampeonatos(data);
    } catch (error) {
      console.error('Error cargando campeonatos:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...campeonatos];

    // Filtro por tipo
    if (activeFilter === 'futbol') {
      filtered = filtered.filter(c => c.tipo_deporte === 'futbol');
    } else if (activeFilter === 'indoor') {
      filtered = filtered.filter(c => c.tipo_deporte === 'indoor');
    } else if (activeFilter === 'en_curso') {
      filtered = filtered.filter(c => c.estado === 'en_curso');
    } else if (activeFilter === 'finalizado') {
      filtered = filtered.filter(c => c.estado === 'finalizado');
    }

    // Filtro por búsqueda
    if (searchQuery.trim()) {
      filtered = filtered.filter(c =>
        c.nombre.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredCampeonatos(filtered);
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadCampeonatos();
  };

  const toggleFavorito = (id: number) => {
    setFavoritos(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
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

  const handleCardPress = (id: number, index: number) => {
    animateCard(index);
    setTimeout(() => {
      if (onSelectCampeonato) {
        onSelectCampeonato(id);
      }
    }, 150);
  };

  const getEstadoBadge = (estado: string) => {
    const badges: Record<string, { text: string; color: string; bg: string }> = {
      en_curso: { text: 'EN CURSO', color: colors.primary, bg: 'rgba(47, 127, 52, 0.1)' },
      planificacion: { text: 'PRÓXIMAMENTE', color: '#B8E994', bg: 'rgba(184, 233, 148, 0.1)' },
      finalizado: { text: 'FINALIZADO', color: '#757575', bg: '#F5F5F5' },
    };
    return badges[estado] || badges.planificacion;
  };

  const formatFecha = (fecha: string) => {
    const date = new Date(fecha);
    const dia = date.getDate();
    const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
    const mes = meses[date.getMonth()];
    return `${dia} ${mes}`;
  };

  const getFilterLabel = (filter: FilterType) => {
    switch (filter) {
      case 'todos': return 'Todos';
      case 'futbol': return 'Fútbol';
      case 'indoor': return 'Indoor';
      case 'en_curso': return 'En curso';
      case 'finalizado': return 'Finalizados';
      default: return 'Todos';
    }
  };

  const renderFilterChip = (filter: FilterType) => (
    <TouchableOpacity
      key={filter}
      style={[
        styles.filterChip,
        activeFilter === filter && styles.filterChipActive
      ]}
      onPress={() => setActiveFilter(filter)}
      activeOpacity={0.7}
    >
      <Text style={[
        styles.filterChipText,
        activeFilter === filter && styles.filterChipTextActive
      ]}>
        {getFilterLabel(filter)}
      </Text>
    </TouchableOpacity>
  );

  const renderCampeonatoCard = ({ item, index }: { item: Campeonato; index: number }) => {
    const isFavorito = favoritos.has(item.id_campeonato);
    const badge = getEstadoBadge(item.estado);
    const isGrayscale = item.estado === 'finalizado';

    return (
      <Animated.View 
        style={[
          styles.cardContainer,
          { transform: [{ scale: cardScales[index] }] }
        ]}
      >
        <TouchableOpacity
          style={styles.card}
          onPress={() => handleCardPress(item.id_campeonato, index)}
          activeOpacity={0.9}
        >
          {/* Botón Favorito */}
          <TouchableOpacity
            style={[
              styles.favButton,
              isFavorito && styles.favButtonActive
            ]}
            onPress={(e) => {
              e.stopPropagation();
              toggleFavorito(item.id_campeonato);
            }}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.favIcon,
              isFavorito && styles.favIconActive
            ]}>
              {isFavorito ? '★' : '☆'}
            </Text>
          </TouchableOpacity>

          {/* Imagen del campeonato */}
          <View style={[styles.imageContainer, isGrayscale && styles.imageGrayscale]}>
            {item.logo_url ? (
              <Image 
                source={{ uri: item.logo_url }} 
                style={styles.image}
              />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Text style={styles.imagePlaceholderIcon}>
                  {item.tipo_deporte === 'futbol' ? '⚽' : '🏟️'}
                </Text>
              </View>
            )}
          </View>

          {/* Contenido de la card */}
          <View style={styles.cardContent}>
            {/* Badge de estado */}
            <View style={[styles.estadoBadge, { backgroundColor: badge.bg }]}>
              <Text style={[styles.estadoBadgeText, { color: badge.color }]}>
                {badge.text}
              </Text>
            </View>

            {/* Nombre del campeonato */}
            <Text style={styles.cardTitle} numberOfLines={1}>
              {item.nombre}
            </Text>

            {/* Info adicional */}
            <View style={styles.cardInfo}>
              <View style={styles.infoRow}>
                <Text style={styles.infoIcon}>📅</Text>
                <Text style={styles.infoText}>
                  {formatFecha(item.fecha_inicio)} - {formatFecha(item.fecha_fin)}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoIcon}>👥</Text>
                <Text style={styles.infoText}>
                  {item.total_equipos_inscritos || 0} Equipos
                </Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Cargando campeonatos...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <View style={styles.iconContainer}>
            <Text style={styles.headerIcon}>⚽</Text>
          </View>
          <Text style={styles.headerTitle}>Campeonatos</Text>
          <TouchableOpacity style={styles.filterButton} activeOpacity={0.7}>
            <Text style={styles.filterButtonIcon}>⚙️</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Barra de búsqueda */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Buscar campeonatos..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholderTextColor="#9E9E9E"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity 
              onPress={() => setSearchQuery('')}
              style={styles.clearButton}
            >
              <Text style={styles.clearIcon}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Filtros */}
      <View style={styles.filtersContainer}>
        <FlatList
          horizontal
          data={['todos', 'futbol', 'indoor', 'en_curso', 'finalizado'] as FilterType[]}
          renderItem={({ item }) => renderFilterChip(item)}
          keyExtractor={(item) => item}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersContent}
        />
      </View>

      {/* Lista de campeonatos */}
      {filteredCampeonatos.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>🏆</Text>
          <Text style={styles.emptyTitle}>No se encontraron campeonatos</Text>
          <Text style={styles.emptyText}>
            {searchQuery 
              ? `No hay resultados para "${searchQuery}"`
              : 'Intenta con otros filtros'
            }
          </Text>
        </View>
      ) : (
        <FlatList
          data={filteredCampeonatos}
          renderItem={renderCampeonatoCard}
          keyExtractor={(item) => item.id_campeonato.toString()}
          numColumns={2}
          contentContainerStyle={styles.listContainer}
          columnWrapperStyle={styles.row}
          refreshControl={
            <RefreshControl 
              refreshing={refreshing} 
              onRefresh={onRefresh} 
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* FAB */}
      <TouchableOpacity style={styles.fab} activeOpacity={0.8}>
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
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
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#757575',
    fontWeight: '500',
  },

  // ===== HEADER =====
  header: {
    backgroundColor: 'rgba(245, 245, 245, 0.95)',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 48,
  },
  iconContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerIcon: {
    fontSize: 24,
    color: colors.primary,
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111811',
    textAlign: 'center',
  },
  filterButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterButtonIcon: {
    fontSize: 20,
  },

  // ===== SEARCH =====
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  searchIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#111811',
  },
  clearButton: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearIcon: {
    fontSize: 16,
    color: '#9E9E9E',
  },

  // ===== FILTERS =====
  filtersContainer: {
    paddingVertical: 12,
  },
  filtersContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    height: 36,
    paddingHorizontal: 20,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#616161',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },

  // ===== CARDS =====
  listContainer: {
    padding: 16,
    paddingBottom: 100,
  },
  row: {
    justifyContent: 'space-between',
  },
  cardContainer: {
    width: '48%',
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    position: 'relative',
  },
  favButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  favButtonActive: {
    backgroundColor: 'rgba(255, 111, 0, 0.9)',
  },
  favIcon: {
    fontSize: 18,
    color: '#9E9E9E',
  },
  favIconActive: {
    color: '#FFFFFF',
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    backgroundColor: '#F5F5F5',
  },
  imageGrayscale: {
    opacity: 0.6,
  },
  image: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderIcon: {
    fontSize: 40,
  },
  cardContent: {
    padding: 12,
  },
  estadoBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 8,
  },
  estadoBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#111811',
    marginBottom: 8,
  },
  cardInfo: {
    gap: 4,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  infoIcon: {
    fontSize: 14,
  },
  infoText: {
    fontSize: 11,
    color: '#757575',
  },

  // ===== EMPTY STATE =====
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 48,
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
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#757575',
    textAlign: 'center',
    lineHeight: 20,
  },

  // ===== FAB =====
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#B8E994',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#B8E994',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },
  fabIcon: {
    fontSize: 32,
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
});