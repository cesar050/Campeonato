import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Image,
  Platform,
  Linking,
  BackHandler,
  Dimensions,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, Region } from 'react-native-maps';
// Iconos reemplazados por emojis
import axios from 'axios';
import { colors } from '../theme/colors';
import { API_BASE_URL, API_TIMEOUT } from '../utils/constants';

const API_URL = API_BASE_URL;

// Función helper para corregir URLs de localhost
const fixLocalhostUrl = (url: string | null | undefined): string | null => {
  if (!url) {
    console.log('⚠️ [SedesMapScreen] URL vacía o null');
    return null;
  }
  
  console.log('🔗 [SedesMapScreen] URL original:', url);
  console.log('🔗 [SedesMapScreen] API_URL:', API_URL);
  
  // Si ya es una URL completa, corregir localhost
  if (url.startsWith('http://') || url.startsWith('https://')) {
    let fixedUrl = url;
    
    // Reemplazar cualquier variante de localhost con API_URL
    if (url.includes('localhost:5000')) {
      fixedUrl = url.replace(/http:\/\/localhost:5000/g, API_URL);
      console.log('🔗 [SedesMapScreen] Reemplazado localhost:5000');
    } else if (url.includes('127.0.0.1:5000')) {
      fixedUrl = url.replace(/http:\/\/127\.0\.0\.1:5000/g, API_URL);
      console.log('🔗 [SedesMapScreen] Reemplazado 127.0.0.1:5000');
    } else if (url.includes('localhost')) {
      fixedUrl = url.replace(/http:\/\/localhost/g, API_URL);
      console.log('🔗 [SedesMapScreen] Reemplazado localhost');
    }
    
    console.log('🔗 [SedesMapScreen] URL corregida (completa):', fixedUrl);
    return fixedUrl;
  }
  
  // Si es una ruta relativa, construir la URL completa
  let cleanPath = url.trim();
  
  // Remover / inicial si existe
  if (cleanPath.startsWith('/')) {
    cleanPath = cleanPath.substring(1);
  }
  
  // Si ya incluye 'uploads/', usar tal cual
  if (cleanPath.startsWith('uploads/')) {
    // Ya está bien formada
  } else {
    // Detectar el tipo de archivo por el path
    if (cleanPath.startsWith('logos/')) {
      cleanPath = `uploads/${cleanPath}`;
    } else if (cleanPath.startsWith('fotos_estadios/')) {
      cleanPath = `uploads/${cleanPath}`;
    } else if (cleanPath.startsWith('fotos_jugadores/')) {
      cleanPath = `uploads/${cleanPath}`;
    } else if (cleanPath.startsWith('documentos_jugadores/')) {
      cleanPath = `uploads/${cleanPath}`;
    } else {
      // Si es solo un nombre de archivo, intentar detectar el tipo por extensión o contexto
      // Por defecto, asumir que es un logo
      cleanPath = `uploads/logos/${cleanPath}`;
    }
  }
  
  const finalUrl = `${API_URL}/${cleanPath}`;
  console.log('🔗 [SedesMapScreen] URL construida (relativa):', finalUrl);
  return finalUrl;
};

interface Sede {
  id_equipo: number;
  nombre_equipo: string;
  estadio: string;
  latitud: number;
  longitud: number;
  logo_url?: string;
  estadio_foto?: string;
}

interface Props {
  campeonatoId: number;
  onBack: () => void;
}

export const SedesMapScreen: React.FC<Props> = ({ campeonatoId, onBack }) => {
  const [loading, setLoading] = useState(true);
  const [sedes, setSedes] = useState<Sede[]>([]);
  const [selectedSede, setSelectedSede] = useState<Sede | null>(null);
  const [viewMode, setViewMode] = useState<'mapa' | 'lista'>('mapa');
  const [logosLoaded, setLogosLoaded] = useState<Set<number>>(new Set());
  const [dimensions, setDimensions] = useState(Dimensions.get('window'));
  const [showPlaces, setShowPlaces] = useState(true); // Mostrar etiquetas de lugares por defecto
  // Región inicial: Ecuador (centro del país)
  const [region, setRegion] = useState<Region>({
    latitude: -0.22,
    longitude: -78.50,
    latitudeDelta: 0.1,
    longitudeDelta: 0.1,
  });

  useEffect(() => {
    loadSedes();
    
    // Listener para cambios de orientación
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
    });
    
    return () => subscription?.remove();
  }, []);

  useEffect(() => {
    console.log('🔄 [SedesMapScreen] Estado de sedes actualizado:', {
      total: sedes.length,
      sedes: sedes.map(s => ({
        id: s.id_equipo,
        nombre: s.nombre_equipo,
        estadio: s.estadio,
        lat: s.latitud,
        lon: s.longitud,
      })),
    });
    
    // Ajustar el mapa automáticamente cuando se cargan las sedes
    if (sedes.length > 0 && viewMode === 'mapa') {
      // Pequeño delay para asegurar que el mapa esté listo
      setTimeout(() => {
        fitToMarkers();
      }, 500);
    }
  }, [sedes, viewMode]);

  // Manejar el botón de atrás del hardware
  useEffect(() => {
    if (Platform.OS !== 'android') {
      return;
    }

    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      // Si hay un bottom sheet abierto (selectedSede), cerrarlo
      if (selectedSede) {
        setSelectedSede(null);
        return true; // Indica que manejamos el evento
      }
      
      // Si no hay bottom sheet abierto, volver a la pantalla anterior
      onBack();
      return true; // Siempre manejamos el evento para evitar salir de la app
    });

    // Limpiar el listener cuando el componente se desmonte o cambie selectedSede
    return () => backHandler.remove();
  }, [selectedSede, onBack]);

  useEffect(() => {
    if (selectedSede) {
      console.log('📍 [SedesMapScreen] Sede seleccionada:', {
        id: selectedSede.id_equipo,
        nombre: selectedSede.nombre_equipo,
        estadio: selectedSede.estadio,
        estadio_foto: selectedSede.estadio_foto,
        logo_url: selectedSede.logo_url,
      });
    }
  }, [selectedSede]);

  const loadSedes = async () => {
    try {
      setLoading(true);
      
      console.log('🔍 [SedesMapScreen] Iniciando carga de sedes para campeonato:', campeonatoId);
      console.log('🔍 [SedesMapScreen] URL del API:', `${API_URL}/campeonatos/${campeonatoId}/inscripciones`);
      
      const equiposRes = await axios.get(`${API_URL}/campeonatos/${campeonatoId}/inscripciones`, {
        params: { estado: 'aprobado' },
        timeout: API_TIMEOUT,
      });

      // 1. Log de la respuesta completa del API
      console.log('📦 [SedesMapScreen] Respuesta completa del API:', JSON.stringify(equiposRes.data, null, 2));
      console.log('📦 [SedesMapScreen] Estructura de inscripciones:', equiposRes.data.inscripciones ? 'existe' : 'no existe');
      console.log('📦 [SedesMapScreen] Total de inscripciones:', equiposRes.data.inscripciones?.length || 0);

      const equiposData = equiposRes.data.inscripciones?.map((i: any) => i.equipo) || [];
      
      // 2. Log de los equipos extraídos
      console.log('👥 [SedesMapScreen] Equipos extraídos (total):', equiposData.length);
      console.log('👥 [SedesMapScreen] Equipos extraídos (detalle):', JSON.stringify(equiposData, null, 2));
      
      // Log de cada equipo individualmente para ver sus propiedades
      equiposData.forEach((equipo: any, index: number) => {
        console.log(`👥 [SedesMapScreen] Equipo ${index + 1}:`, {
          id_equipo: equipo?.id_equipo,
          nombre: equipo?.nombre,
          estadio: equipo?.estadio,
          estadio_latitud: equipo?.estadio_latitud,
          estadio_longitud: equipo?.estadio_longitud,
          tiene_estadio: !!equipo?.estadio,
          tiene_latitud: !!equipo?.estadio_latitud,
          tiene_longitud: !!equipo?.estadio_longitud,
        });
      });
      
      // 3. Log antes del filtrado
      const equiposConEstadio = equiposData.filter((e: any) => e.estadio);
      const equiposConCoordenadas = equiposData.filter((e: any) => e.estadio_latitud && e.estadio_longitud);
      const equiposCompletos = equiposData.filter((e: any) => e.estadio && e.estadio_latitud && e.estadio_longitud);
      
      console.log('🔍 [SedesMapScreen] Equipos con estadio:', equiposConEstadio.length);
      console.log('🔍 [SedesMapScreen] Equipos con coordenadas:', equiposConCoordenadas.length);
      console.log('🔍 [SedesMapScreen] Equipos completos (estadio + coordenadas):', equiposCompletos.length);
      
      const sedesConCoordenadas = equiposData
        .filter((e: any) => {
          // Validar que tenga estadio y coordenadas válidas
          const tieneEstadio = !!e.estadio;
          const lat = parseFloat(e.estadio_latitud);
          const lon = parseFloat(e.estadio_longitud);
          const tieneCoordenadasValidas = !isNaN(lat) && !isNaN(lon) && lat !== 0 && lon !== 0;
          
          if (!tieneEstadio || !tieneCoordenadasValidas) {
            console.log('❌ [SedesMapScreen] Equipo filtrado (sin datos completos):', {
              nombre: e.nombre,
              tiene_estadio: tieneEstadio,
              latitud: e.estadio_latitud,
              longitud: e.estadio_longitud,
              lat_parseada: lat,
              lon_parseada: lon,
              es_valida: tieneCoordenadasValidas,
            });
          }
          return tieneEstadio && tieneCoordenadasValidas;
        })
        .map((e: any) => {
          // Corregir URLs usando la función helper
          const logoUrl = fixLocalhostUrl(e.logo_url);
          const estadioFotoUrl = fixLocalhostUrl(e.estadio_foto);
          
          console.log('🖼️ [SedesMapScreen] ===== Procesando equipo =====');
          console.log('🖼️ [SedesMapScreen] Nombre:', e.nombre);
          console.log('🖼️ [SedesMapScreen] logo_url original:', e.logo_url);
          console.log('🖼️ [SedesMapScreen] logo_url corregida:', logoUrl);
          console.log('🖼️ [SedesMapScreen] estadio_foto original:', e.estadio_foto);
          console.log('🖼️ [SedesMapScreen] estadio_foto corregida:', estadioFotoUrl);
          console.log('🖼️ [SedesMapScreen] API_BASE_URL:', API_URL);
          
          const lat = parseFloat(e.estadio_latitud);
          const lon = parseFloat(e.estadio_longitud);
          
          const sede = {
          id_equipo: e.id_equipo,
          nombre_equipo: e.nombre,
          estadio: e.estadio,
            latitud: lat,
            longitud: lon,
            logo_url: logoUrl,
            estadio_foto: estadioFotoUrl,
          };
          console.log('✅ [SedesMapScreen] Sede final procesada:', {
            id_equipo: sede.id_equipo,
            nombre_equipo: sede.nombre_equipo,
            estadio: sede.estadio,
            latitud: sede.latitud,
            longitud: sede.longitud,
            logo_url: sede.logo_url,
            estadio_foto: sede.estadio_foto,
          });
          console.log('🖼️ [SedesMapScreen] ============================');
          return sede;
        });

      // 4. Log del total de sedes encontradas
      console.log('📊 [SedesMapScreen] Total de sedes con coordenadas encontradas:', sedesConCoordenadas.length);
      console.log('📊 [SedesMapScreen] Sedes finales:', JSON.stringify(sedesConCoordenadas, null, 2));
      
      // Validación final de coordenadas válidas
      const sedesValidas = sedesConCoordenadas.filter((s: Sede) => {
        const esValida = !isNaN(s.latitud) && !isNaN(s.longitud) && 
          s.latitud !== 0 && s.longitud !== 0 &&
          s.latitud >= -90 && s.latitud <= 90 &&
          s.longitud >= -180 && s.longitud <= 180;
        if (!esValida) {
          console.warn('⚠️ [SedesMapScreen] Sede con coordenadas inválidas:', {
            nombre: s.nombre_equipo,
            latitud: s.latitud,
            longitud: s.longitud,
          });
        }
        return esValida;
      });
      console.log('✅ [SedesMapScreen] Sedes con coordenadas válidas:', sedesValidas.length);
      console.log('📊 [SedesMapScreen] Total procesadas:', sedesConCoordenadas.length);

      if (sedesConCoordenadas.length !== sedesValidas.length) {
        console.warn('⚠️ [SedesMapScreen] Algunas sedes tienen coordenadas inválidas:', 
          sedesConCoordenadas.length - sedesValidas.length);
      }

      setSedes(sedesValidas);
      console.log('💾 [SedesMapScreen] Sedes guardadas en el estado:', sedesConCoordenadas.length);

      if (sedesValidas.length > 0) {
        const latitudes = sedesValidas.map((s: Sede) => s.latitud);
        const longitudes = sedesValidas.map((s: Sede) => s.longitud);
        
        console.log('🗺️ [SedesMapScreen] Coordenadas para calcular región:', {
          latitudes,
          longitudes,
          minLat: Math.min(...latitudes),
          maxLat: Math.max(...latitudes),
          minLon: Math.min(...longitudes),
          maxLon: Math.max(...longitudes),
        });
        
        const centerLat = (Math.max(...latitudes) + Math.min(...latitudes)) / 2;
        const centerLon = (Math.max(...longitudes) + Math.min(...longitudes)) / 2;
        
        const latDelta = Math.max(...latitudes) - Math.min(...latitudes);
        const lonDelta = Math.max(...longitudes) - Math.min(...longitudes);
        
        // Ajustar los deltas para que el mapa muestre bien los marcadores
        // Si hay solo una sede, usar un zoom más cercano
        // Si hay múltiples sedes, asegurar que todas quepan con un margen razonable
        const padding = 0.1; // Padding fijo para todas las sedes
        const minDelta = 0.01; // Zoom mínimo razonable
        const maxDelta = 5; // Zoom máximo reducido para mejor visibilidad
        
        // Calcular deltas con padding razonable
        let calculatedLatDelta = latDelta > 0 ? Math.max((latDelta + padding) * 1.5, 0.5) : 0.5;
        let calculatedLonDelta = lonDelta > 0 ? Math.max((lonDelta + padding) * 1.5, 0.5) : 0.5;
        
        // Si hay solo una sede, usar zoom más cercano
        if (sedesValidas.length === 1) {
          calculatedLatDelta = 0.01;
          calculatedLonDelta = 0.01;
        }
        
        const newRegion = {
          latitude: centerLat,
          longitude: centerLon,
          latitudeDelta: Math.max(Math.min(calculatedLatDelta, maxDelta), minDelta),
          longitudeDelta: Math.max(Math.min(calculatedLonDelta, maxDelta), minDelta),
        };
        
        console.log('🗺️ [SedesMapScreen] Región calculada:', JSON.stringify(newRegion, null, 2));
        console.log('🗺️ [SedesMapScreen] Centro del mapa:', { lat: centerLat, lon: centerLon });
        setRegion(newRegion);
        
        // Forzar actualización del mapa
        setTimeout(() => {
          setRegion({...newRegion});
        }, 100);
      } else {
        console.warn('⚠️ [SedesMapScreen] No hay sedes para calcular región del mapa');
      }

    } catch (error) {
      console.error('❌ [SedesMapScreen] Error cargando sedes:', error);
      if (axios.isAxiosError(error)) {
        console.error('❌ [SedesMapScreen] Error de Axios:', {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
          url: error.config?.url,
        });
      } else {
        console.error('❌ [SedesMapScreen] Error desconocido:', error);
      }
      setSedes([]);
    } finally {
      setLoading(false);
      console.log('🏁 [SedesMapScreen] Carga de sedes finalizada');
    }
  };

  const openDirections = (sede: Sede) => {
    const url = Platform.select({
      ios: `maps:0,0?q=${sede.latitud},${sede.longitud}`,
      android: `geo:0,0?q=${sede.latitud},${sede.longitud}(${sede.estadio})`
    });

    Linking.openURL(url || `https://www.google.com/maps/search/?api=1&query=${sede.latitud},${sede.longitud}`);
  };

  const centerOnLocation = () => {
    if (selectedSede) {
      setRegion({
        latitude: selectedSede.latitud,
        longitude: selectedSede.longitud,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      });
    }
  };

  const fitToMarkers = () => {
    if (sedes.length === 0) return;
    
    const latitudes = sedes.map((s: Sede) => s.latitud);
    const longitudes = sedes.map((s: Sede) => s.longitud);
    
    const minLat = Math.min(...latitudes);
    const maxLat = Math.max(...latitudes);
    const minLon = Math.min(...longitudes);
    const maxLon = Math.max(...longitudes);
    
    const centerLat = (maxLat + minLat) / 2;
    const centerLon = (maxLon + minLon) / 2;
    
    const latDelta = maxLat - minLat;
    const lonDelta = maxLon - minLon;
    
    // Padding más conservador para mejor visibilidad
    const padding = 0.15;
    const minDelta = 0.1;
    const maxDelta = 3; // Reducido para mejor zoom
    
    const calculatedLatDelta = Math.max(Math.min((latDelta + padding) * 1.5, maxDelta), minDelta);
    const calculatedLonDelta = Math.max(Math.min((lonDelta + padding) * 1.5, maxDelta), minDelta);
    
    const newRegion = {
      latitude: centerLat,
      longitude: centerLon,
      latitudeDelta: calculatedLatDelta,
      longitudeDelta: calculatedLonDelta,
    };
    
    console.log('🎯 [SedesMapScreen] Ajustando mapa a marcadores:', newRegion);
    setRegion(newRegion);
  };

  const renderBottomSheet = () => {
    if (!selectedSede) return null;

    return (
      <View style={styles.bottomSheet}>
        <TouchableOpacity 
          style={styles.handleContainer}
          onPress={() => setSelectedSede(null)}
          activeOpacity={0.7}
        >
          <View style={styles.handle} />
        </TouchableOpacity>
        
        <ScrollView 
          style={styles.sheetContent} 
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.sheetContentContainer}
        >
          {/* Header */}
          <View style={styles.sheetHeader}>
            <View style={styles.sheetHeaderLeft}>
              <Text style={styles.sheetTitle}>{selectedSede.estadio}</Text>
              <View style={styles.sheetSubtitle}>
                <Text style={styles.emojiIcon}>⚽</Text>
                <Text style={styles.sheetTeam}>Local: {selectedSede.nombre_equipo}</Text>
              </View>
            </View>
            {selectedSede.logo_url ? (
              <Image 
                source={{ 
                  uri: selectedSede.logo_url,
                  cache: 'force-cache'
                }} 
                style={styles.sheetLogo}
                onError={(error) => {
                  console.warn('⚠️ [SedesMapScreen] Error cargando logo en bottom sheet:', selectedSede.logo_url, error);
                }}
              />
            ) : (
              <View style={styles.sheetLogoPlaceholder}>
                <Text style={styles.sheetLogoPlaceholderText}>
                  {selectedSede.nombre_equipo.charAt(0)}
                </Text>
              </View>
            )}
          </View>

          {/* Imagen del estadio */}
          <View style={styles.sheetImage}>
            {selectedSede.estadio_foto ? (
              <Image 
                source={{ 
                  uri: selectedSede.estadio_foto,
                  cache: 'force-cache'
                }} 
                style={styles.sheetImageFull}
                resizeMode="cover"
                onLoadStart={() => {
                  console.log('⏳ [SedesMapScreen] Iniciando carga de foto del estadio');
                  console.log('⏳ [SedesMapScreen] URL:', selectedSede.estadio_foto);
                  console.log('⏳ [SedesMapScreen] API_BASE_URL:', API_URL);
                }}
                onLoad={() => {
                  console.log('✅ [SedesMapScreen] Foto del estadio cargada exitosamente');
                  console.log('✅ [SedesMapScreen] URL final:', selectedSede.estadio_foto);
                }}
                onError={(error) => {
                  console.error('❌ [SedesMapScreen] ===== ERROR CARGANDO FOTO ESTADIO =====');
                  console.error('❌ [SedesMapScreen] URL intentada:', selectedSede.estadio_foto);
                  console.error('❌ [SedesMapScreen] API_BASE_URL:', API_URL);
                  console.error('❌ [SedesMapScreen] Error details:', JSON.stringify(error.nativeEvent, null, 2));
                  console.error('❌ [SedesMapScreen] ===========================================');
                }}
              />
            ) : (
              <View style={styles.sheetImagePlaceholder}>
                <Text style={styles.emojiLarge}>🏟️</Text>
                <Text style={styles.sheetImagePlaceholderText}>
                  No hay imagen disponible
                </Text>
                <Text style={styles.sheetImagePlaceholderSubtext}>
                  El equipo no ha subido una foto del estadio
                </Text>
              </View>
            )}
          </View>

          {/* Información del estadio */}
          <View style={styles.sheetDetails}>
            <View style={styles.detailRow}>
              <View style={styles.detailItem}>
                <View style={styles.detailIcon}>
                  <Text style={styles.emojiIcon}>👥</Text>
                </View>
                <View style={styles.detailInfo}>
                  <Text style={styles.detailLabel}>CAPACIDAD</Text>
                  <Text style={styles.detailValue}>Por definir</Text>
                </View>
              </View>

              <View style={styles.detailItem}>
                <View style={styles.detailIcon}>
                  <Text style={styles.emojiIcon}>🌱</Text>
                </View>
                <View style={styles.detailInfo}>
                  <Text style={styles.detailLabel}>SUPERFICIE</Text>
                  <Text style={styles.detailValue}>Césped Natural</Text>
                </View>
              </View>
            </View>

            <View style={styles.detailItemFull}>
              <View style={styles.detailIcon}>
                <Text style={styles.emojiIcon}>📍</Text>
              </View>
              <View style={styles.detailInfo}>
                <Text style={styles.detailLabel}>ESTADIO</Text>
                <Text style={styles.detailValue}>{selectedSede.estadio}</Text>
              </View>
            </View>
            
            <View style={styles.detailItemFull}>
              <View style={styles.detailIcon}>
                <Text style={styles.emojiIcon}>ℹ️</Text>
              </View>
              <View style={styles.detailInfo}>
                <Text style={styles.detailLabel}>EQUIPO</Text>
                <Text style={styles.detailValue}>{selectedSede.nombre_equipo}</Text>
              </View>
            </View>

            <View style={styles.detailItemFull}>
              <View style={styles.detailIcon}>
                <Text style={styles.emojiIcon}>🗺️</Text>
              </View>
              <View style={styles.detailInfo}>
                <Text style={styles.detailLabel}>COORDENADAS</Text>
                <Text style={styles.detailValue}>
                  {selectedSede.latitud.toFixed(4)}, {selectedSede.longitud.toFixed(4)}
                </Text>
              </View>
            </View>
          </View>

          {/* Botón de direcciones */}
          <TouchableOpacity
            style={styles.directionsButton}
            onPress={() => openDirections(selectedSede)}
            activeOpacity={0.8}
          >
            <Text style={styles.emojiButton}>🧭</Text>
            <Text style={styles.directionsText}>Cómo llegar</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  };

  const renderListView = () => (
    <ScrollView style={styles.listContainer} showsVerticalScrollIndicator={false}>
      {sedes.map((sede) => (
        <TouchableOpacity
          key={sede.id_equipo}
          style={styles.listItem}
          onPress={() => {
            setSelectedSede(sede);
            setViewMode('mapa');
            setRegion({
              latitude: sede.latitud,
              longitude: sede.longitud,
              latitudeDelta: 0.05,
              longitudeDelta: 0.05,
            });
          }}
          activeOpacity={0.7}
        >
          <View style={styles.listItemLeft}>
            {sede.logo_url ? (
              <Image 
                source={{ 
                  uri: sede.logo_url,
                  cache: 'force-cache'
                }} 
                style={styles.listLogo}
                onError={(error) => {
                  console.warn('⚠️ [SedesMapScreen] Error cargando logo en lista:', sede.logo_url, error);
                }}
              />
            ) : (
              <View style={styles.listLogoPlaceholder}>
                <Text style={styles.listLogoText}>{sede.nombre_equipo.charAt(0)}</Text>
              </View>
            )}
            <View style={styles.listInfo}>
              <Text style={styles.listTitle}>{sede.estadio}</Text>
              <Text style={styles.listSubtitle}>{sede.nombre_equipo}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.listDirectionsButton}
            onPress={(e) => {
              e.stopPropagation();
              openDirections(sede);
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.emojiButtonSmall}>🧭</Text>
          </TouchableOpacity>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Cargando sedes...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack} activeOpacity={0.7}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Sedes del Campeonato</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Toggle Mapa/Lista */}
      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[styles.toggleButton, viewMode === 'mapa' && styles.toggleButtonActive]}
          onPress={() => setViewMode('mapa')}
          activeOpacity={0.7}
        >
          <Text style={[styles.toggleText, viewMode === 'mapa' && styles.toggleTextActive]}>
            Mapa
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleButton, viewMode === 'lista' && styles.toggleButtonActive]}
          onPress={() => setViewMode('lista')}
          activeOpacity={0.7}
        >
          <Text style={[styles.toggleText, viewMode === 'lista' && styles.toggleTextActive]}>
            Lista
          </Text>
        </TouchableOpacity>
      </View>

      {/* Contenido */}
      {viewMode === 'mapa' ? (
          <View style={styles.mapContainer}>
          {sedes.length > 0 && !loading && (
            <View style={styles.mapInfoBadge}>
              <Text style={styles.emojiSmall}>📍</Text>
              <Text style={styles.mapInfoText}>
                {sedes.length} {sedes.length === 1 ? 'sede' : 'sedes'} en el mapa
              </Text>
            </View>
          )}
            <MapView
              provider={PROVIDER_GOOGLE}
              style={styles.map}
              region={region}
            onRegionChangeComplete={(newRegion) => {
              setRegion(newRegion);
            }}
            initialRegion={region}
            showsUserLocation={false}
            showsMyLocationButton={false}
            loadingEnabled={true}
            mapType="standard"
            zoomEnabled={true}
            scrollEnabled={true}
            pitchEnabled={true}
            rotateEnabled={true}
            toolbarEnabled={false}
            liteMode={false}
            showsPointsOfInterest={true}
            showsBuildings={true}
            showsTraffic={false}
            showsIndoors={false}
            showsCompass={true}
            showsScale={true}
            onMapReady={() => {
              console.log('🗺️ [SedesMapScreen] ✅ Mapa estándar listo!');
              console.log('🗺️ [SedesMapScreen] Total de sedes:', sedes.length);
              if (sedes.length > 0) {
                console.log('🗺️ [SedesMapScreen] Coordenadas de sedes:', sedes.map(s => ({
                  nombre: s.nombre_equipo,
                  estadio: s.estadio,
                  lat: s.latitud,
                  lon: s.longitud
                })));
                setTimeout(() => {
                  fitToMarkers();
                }, 1500);
              }
            }}
            onError={(error) => {
              console.error('❌ [SedesMapScreen] Error en el mapa:', error);
            }}
          >
              {sedes
                .filter((sede) => {
                  // Validar coordenadas antes de renderizar
                  const esValida = !isNaN(sede.latitud) && !isNaN(sede.longitud) && 
                    sede.latitud !== 0 && sede.longitud !== 0 &&
                    sede.latitud >= -90 && sede.latitud <= 90 &&
                    sede.longitud >= -180 && sede.longitud <= 180;
                  
                  if (!esValida) {
                    console.warn(`⚠️ [SedesMapScreen] Omitiendo marcador con coordenadas inválidas:`, {
                      id_equipo: sede.id_equipo,
                      nombre: sede.nombre_equipo,
                      latitud: sede.latitud,
                      longitud: sede.longitud,
                    });
                  }
                  return esValida;
                })
                .map((sede) => {
                  console.log(`📍 [SedesMapScreen] Renderizando marcador:`, {
                    id_equipo: sede.id_equipo,
                    nombre: sede.nombre_equipo,
                    estadio: sede.estadio,
                    latitud: sede.latitud,
                    longitud: sede.longitud,
                    logo_url: sede.logo_url,
                  });
                  return (
                <Marker
                      key={`marker-${sede.id_equipo}`}
                  coordinate={{
                    latitude: sede.latitud,
                    longitude: sede.longitud,
                  }}
                      title={`${sede.nombre_equipo}`}
                      description={`🏟️ ${sede.estadio}`}
                      anchor={{ x: 0.5, y: 1 }}
                      tracksViewChanges={false}
                      onPress={() => {
                        console.log('📍 [SedesMapScreen] Marcador presionado:', sede.estadio);
                        setSelectedSede(sede);
                        // Centrar el mapa en el marcador seleccionado con zoom cercano
                        setRegion({
                          latitude: sede.latitud,
                          longitude: sede.longitud,
                          latitudeDelta: 0.05,
                          longitudeDelta: 0.05,
                        });
                      }}
                >
                  <View style={[
                    styles.markerContainer,
                    selectedSede?.id_equipo === sede.id_equipo && styles.markerSelected
                  ]}>
                    <View style={styles.markerLogoWrapper}>
                      {sede.logo_url ? (
                            <Image 
                              source={{ 
                                uri: sede.logo_url,
                                cache: 'force-cache'
                              }} 
                              style={styles.markerLogo}
                              resizeMode="cover"
                              onLoadStart={() => {
                                console.log('⏳ [SedesMapScreen] Iniciando carga de logo:', sede.logo_url);
                              }}
                              onError={(error) => {
                                console.error('❌ [SedesMapScreen] Error cargando logo en marcador');
                                console.error('❌ [SedesMapScreen] URL intentada:', sede.logo_url);
                                console.error('❌ [SedesMapScreen] API_BASE_URL:', API_URL);
                                console.error('❌ [SedesMapScreen] Error details:', JSON.stringify(error.nativeEvent, null, 2));
                                // Si falla la carga, marcar como cargado para evitar loops
                                setLogosLoaded(prev => new Set(prev).add(sede.id_equipo));
                              }}
                              onLoad={() => {
                                console.log('✅ [SedesMapScreen] Logo cargado correctamente en marcador');
                                console.log('✅ [SedesMapScreen] URL final:', sede.logo_url);
                                // Marcar el logo como cargado
                                setLogosLoaded(prev => new Set(prev).add(sede.id_equipo));
                              }}
                            />
                      ) : (
                        <View style={styles.markerLogoPlaceholder}>
                              <Text style={styles.markerLogoText}>{sede.nombre_equipo.charAt(0).toUpperCase()}</Text>
                        </View>
                      )}
                    </View>
                        {/* Indicador de pin */}
                        <View style={styles.markerPin} />
                  </View>
                </Marker>
                  );
                })}
            </MapView>

            {/* Botones de control */}
            <View style={styles.mapControlsContainer}>
              {sedes.length > 0 && (
              <TouchableOpacity 
                style={styles.mapControlButton}
                  onPress={fitToMarkers}
                  activeOpacity={0.7}
                >
                  <Text style={styles.emojiControl}>🎯</Text>
                </TouchableOpacity>
              )}
              {selectedSede && (
                <TouchableOpacity 
                  style={[styles.mapControlButton, styles.mapControlButtonSecondary]}
                onPress={centerOnLocation}
                activeOpacity={0.7}
              >
                <Text style={styles.emojiControl}>📍</Text>
              </TouchableOpacity>
            )}
              <TouchableOpacity 
                style={[styles.mapControlButton, styles.mapControlButtonSecondary, !showPlaces && styles.mapControlButtonInactive]}
                onPress={() => setShowPlaces(!showPlaces)}
                activeOpacity={0.7}
              >
                <Text style={styles.emojiControl}>{showPlaces ? "🗺️" : "🗺️"}</Text>
              </TouchableOpacity>
            </View>

          {sedes.length === 0 && !loading && (
            <View style={styles.emptyStateOverlay}>
              <Text style={styles.emojiLarge}>🏟️</Text>
              <Text style={styles.emptyText}>No hay sedes con ubicación registrada</Text>
              <Text style={styles.emptySubtext}>Las sedes aparecerán aquí cuando tengan coordenadas válidas</Text>
            </View>
          )}
          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Cargando mapa...</Text>
            </View>
          )}
            {/* Bottom Sheet */}
            {renderBottomSheet()}
          </View>
      ) : (
        renderListView()
      )}

      {sedes.length === 0 && !loading && viewMode === 'lista' && (
        <View style={styles.emptyState}>
          <Text style={styles.emojiLarge}>🏟️</Text>
          <Text style={styles.emptyText}>No hay sedes registradas</Text>
        </View>
      )}
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
    marginTop: 12,
    fontSize: 14,
    color: '#757575',
  },

  // HEADER
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(246, 248, 246, 0.95)',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 28,
    color: colors.primary,
    fontWeight: 'bold',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111811',
  },
  headerRight: {
    width: 40,
  },

  // TOGGLE
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#E0E0E0',
    margin: 16,
    borderRadius: 12,
    padding: 4,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  toggleButtonActive: {
    backgroundColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#757575',
  },
  toggleTextActive: {
    color: colors.primary,
    fontWeight: 'bold',
  },

  // MAP
  mapContainer: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#E0E0E0', // Color de fondo para verificar que el contenedor se renderiza
  },
  map: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  mapControlsContainer: {
    position: 'absolute',
    top: 16,
    right: 16,
    gap: 8,
  },
  mapControlButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  mapControlButtonSecondary: {
    marginTop: 8,
  },
  mapControlButtonInactive: {
    opacity: 0.5,
  },

  // MARKER
  markerContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    position: 'relative',
    overflow: 'hidden',
    zIndex: 1000,
  },
  markerSelected: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 4,
    borderColor: '#B8E994',
    transform: [{ scale: 1.15 }],
    elevation: 12,
    shadowOpacity: 0.6,
  },
  markerPin: {
    position: 'absolute',
    bottom: -8,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderRightWidth: 6,
    borderTopWidth: 10,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: colors.primary,
  },
  markerLogoWrapper: {
    width: 50,
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  markerLogo: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFFFFF',
  },
  markerLogoPlaceholder: {
    width: 50,
    height: 50,
    backgroundColor: colors.primary,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  markerLogoText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },

  // BOTTOM SHEET
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '65%',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  handleContainer: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  handle: {
    width: 48,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
  },
  sheetContent: {
    flex: 1,
  },
  sheetContentContainer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sheetHeaderLeft: {
    flex: 1,
    paddingRight: 12,
  },
  sheetTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#212121',
    marginBottom: 8,
  },
  sheetSubtitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sheetTeam: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  sheetLogo: {
    width: 56,
    height: 56,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  sheetLogoPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  sheetLogoPlaceholderText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  sheetImage: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
    backgroundColor: '#E0E0E0',
  },
  sheetImageFull: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F5F5F5',
  },
  sheetImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sheetImagePlaceholderText: {
    fontSize: 12,
    color: '#757575',
    fontWeight: '500',
    marginTop: 8,
  },
  sheetImagePlaceholderSubtext: {
    fontSize: 10,
    color: '#9E9E9E',
    marginTop: 4,
    fontStyle: 'italic',
  },
  sheetDetails: {
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  detailItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  detailItemFull: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  detailIcon: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: 'rgba(47, 127, 52, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  detailInfo: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#757575',
    marginBottom: 2,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212121',
  },
  directionsButton: {
    flexDirection: 'row',
    backgroundColor: '#B8E994',
    paddingVertical: 16,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    elevation: 4,
    shadowColor: '#B8E994',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  directionsText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },

  // LIST VIEW
  listContainer: {
    flex: 1,
    padding: 16,
  },
  listItem: {
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
  listItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  listLogo: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  listLogoPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  listLogoText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  listInfo: {
    flex: 1,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212121',
    marginBottom: 4,
  },
  listSubtitle: {
    fontSize: 13,
    color: '#757575',
  },
  listDirectionsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // EMPTY STATE
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 48,
  },
  emptyStateOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    zIndex: 1,
    paddingHorizontal: 48,
  },
  emptyText: {
    fontSize: 16,
    color: '#212121',
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#757575',
    textAlign: 'center',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    zIndex: 2,
  },
  mapInfoBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    zIndex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  mapInfoIcon: {
    marginRight: 0,
  },
  mapInfoText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  // Emoji styles
  emojiIcon: {
    fontSize: 20,
  },
  emojiSmall: {
    fontSize: 14,
  },
  emojiLarge: {
    fontSize: 64,
    textAlign: 'center',
  },
  emojiControl: {
    fontSize: 24,
  },
  emojiButton: {
    fontSize: 20,
    marginRight: 4,
  },
  emojiButtonSmall: {
    fontSize: 18,
  },
});