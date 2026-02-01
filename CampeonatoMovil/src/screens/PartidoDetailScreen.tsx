import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Image,
} from 'react-native';
import axios from 'axios';
import { colors } from '../theme/colors';
import { API_BASE_URL } from '../utils/constants';
import { Platform } from 'react-native';

const API_URL = API_BASE_URL;

// URL del microservicio de alineaciones - usar misma lógica que API principal
const getAlineacionesURL = () => {
  if (__DEV__) {
    if (Platform.OS === 'android') {
      // Usar adb reverse para el microservicio también
      return 'http://127.0.0.1:5001';
    } else {
      return 'http://localhost:5001';
    }
  }
  return 'https://alineaciones-api-produccion.com';
};

const ALINEACIONES_URL = getAlineacionesURL();

interface PartidoDetail {
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
  jornada: number;
  campeonato?: {
    nombre: string;
  };
}

interface EquipoLogo {
  [key: number]: string | null;
}

interface Evento {
  id_evento?: number;
  minuto: number;
  tipo: 'gol' | 'tarjeta_amarilla' | 'tarjeta_roja' | 'sustitucion';
  jugador: string;
  jugador_nombre?: string;
  equipo: string;
  equipo_nombre?: string;
  detalle?: string;
  datos_adicionales?: any;
}

interface AlineacionItem {
  id_alineacion?: number;
  id_partido?: number;
  id_equipo: number;
  id_jugador?: number;
  titular: boolean;
  minuto_entrada?: number;
  minuto_salida?: number;
  posicion_x?: number;
  posicion_y?: number;
  formacion?: string;
  jugador_nombre?: string;
  dorsal?: number;
  posicion?: string;
  equipo_nombre?: string;
}

interface Alineacion {
  equipo: string;
  id_equipo: number;
  titulares: Jugador[];
  suplentes: Jugador[];
  formacion: string;
}

interface Jugador {
  nombre: string;
  numero: number;
  posicion: string;
  id_jugador?: number;
  dorsal?: number;
  posicion_x?: number;
  posicion_y?: number;
}

type TabType = 'timeline' | 'estadisticas' | 'alineaciones';

interface Props {
  partidoId: number;
  onBack: () => void;
}

export const PartidoDetailScreen: React.FC<Props> = ({ partidoId, onBack }) => {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('timeline');
  const [partido, setPartido] = useState<PartidoDetail | null>(null);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [alineaciones, setAlineaciones] = useState<Alineacion[]>([]);
  const [estadisticas, setEstadisticas] = useState<any>(null);
  const [equiposLogos, setEquiposLogos] = useState<EquipoLogo>({});

  useEffect(() => {
    loadData();
  }, [partidoId]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Cargar partido
      const partidoRes = await axios.get(`${API_URL}/partidos/${partidoId}`);
      const partidoData = partidoRes.data.partido || partidoRes.data;
      setPartido(partidoData);
      
      // Cargar logos de los equipos
      await loadEquiposLogos(partidoData);

      // Cargar eventos (goles, tarjetas, etc.)
      let eventosData: Evento[] = [];
      try {
        // Intentar endpoint público nuevo: /eventos/partidos/<id>/eventos
        try {
          console.log('🔍 Intentando cargar eventos desde endpoint público:', `${API_URL}/eventos/partidos/${partidoId}/eventos`);
          const eventosRes = await axios.get(`${API_URL}/eventos/partidos/${partidoId}/eventos`, {
            timeout: 5000,
          });
          const responseData = eventosRes.data;
          console.log('📦 Respuesta de eventos (raw):', JSON.stringify(responseData, null, 2));
          
          // La respuesta viene como { eventos: [...], total: ..., goles_local: ..., goles_visitante: ... }
          if (responseData.eventos && Array.isArray(responseData.eventos)) {
            eventosData = responseData.eventos.map((e: any) => ({
              id_evento: e.id_evento,
              minuto: e.minuto || 0,
              tipo: e.tipo,
              jugador: e.jugador_nombre || e.jugador || 'Jugador desconocido',
              jugador_nombre: e.jugador_nombre,
              equipo: e.equipo_nombre || e.equipo || 'Equipo desconocido',
              equipo_nombre: e.equipo_nombre,
              detalle: e.datos_adicionales ? JSON.stringify(e.datos_adicionales) : undefined,
              datos_adicionales: e.datos_adicionales,
            }));
            console.log('✅ Eventos procesados desde endpoint público:', eventosData.length);
          } else if (Array.isArray(responseData)) {
            eventosData = responseData.map((e: any) => ({
              id_evento: e.id_evento,
              minuto: e.minuto || 0,
              tipo: e.tipo,
              jugador: e.jugador_nombre || e.jugador || 'Jugador desconocido',
              jugador_nombre: e.jugador_nombre,
              equipo: e.equipo_nombre || e.equipo || 'Equipo desconocido',
              equipo_nombre: e.equipo_nombre,
              detalle: e.datos_adicionales ? JSON.stringify(e.datos_adicionales) : undefined,
              datos_adicionales: e.datos_adicionales,
            }));
          }
        } catch (error1: any) {
          console.log('❌ Error cargando eventos desde endpoint público:', {
            message: error1.message,
            response: error1.response?.data,
            status: error1.response?.status,
          });
          
          // Intentar endpoint alternativo: /partidos/<id>/eventos (por si acaso)
          try {
            console.log('🔍 Intentando endpoint alternativo:', `${API_URL}/partidos/${partidoId}/eventos`);
            const eventosRes2 = await axios.get(`${API_URL}/partidos/${partidoId}/eventos`, {
              timeout: 5000,
            });
            const responseData2 = eventosRes2.data;
            if (responseData2.eventos && Array.isArray(responseData2.eventos)) {
              eventosData = responseData2.eventos.map((e: any) => ({
                id_evento: e.id_evento,
                minuto: e.minuto || 0,
                tipo: e.tipo,
                jugador: e.jugador_nombre || e.jugador || 'Jugador desconocido',
                jugador_nombre: e.jugador_nombre,
                equipo: e.equipo_nombre || e.equipo || 'Equipo desconocido',
                equipo_nombre: e.equipo_nombre,
                detalle: e.datos_adicionales ? JSON.stringify(e.datos_adicionales) : undefined,
                datos_adicionales: e.datos_adicionales,
              }));
              console.log('✅ Eventos cargados desde endpoint alternativo:', eventosData.length);
            }
          } catch (error2) {
            console.log('⚠️ No hay eventos disponibles desde ningún endpoint');
          }
        }
        
        setEventos(eventosData);
        console.log('✅ Total eventos cargados:', eventosData.length);
        if (eventosData.length > 0) {
          console.log('📋 Primeros eventos:', eventosData.slice(0, 3).map(e => ({
            minuto: e.minuto,
            tipo: e.tipo,
            jugador: e.jugador,
            equipo: e.equipo,
          })));
        }
      } catch (error) {
        console.error('❌ Error general cargando eventos:', error);
        setEventos([]);
      }

      // Cargar estadísticas del partido
      try {
        const statsRes = await axios.get(`${API_URL}/organizador/partidos/${partidoId}/estadisticas`);
        setEstadisticas(statsRes.data);
        console.log('✅ Estadísticas cargadas:', statsRes.data);
      } catch (error) {
        console.log('No hay estadísticas disponibles (requiere auth), calculando desde eventos');
        // Crear estadísticas básicas desde los eventos cargados
        const statsBasicas = {
          local: {
            goles: partidoData.goles_local || 0,
            tarjetas_amarillas: eventosData.filter((e: Evento) => e.tipo === 'tarjeta_amarilla' && (e.equipo === partidoData.equipo_local || e.equipo_nombre === partidoData.equipo_local)).length,
            tarjetas_rojas: eventosData.filter((e: Evento) => e.tipo === 'tarjeta_roja' && (e.equipo === partidoData.equipo_local || e.equipo_nombre === partidoData.equipo_local)).length,
            goleadores: {},
          },
          visitante: {
            goles: partidoData.goles_visitante || 0,
            tarjetas_amarillas: eventosData.filter((e: Evento) => e.tipo === 'tarjeta_amarilla' && (e.equipo === partidoData.equipo_visitante || e.equipo_nombre === partidoData.equipo_visitante)).length,
            tarjetas_rojas: eventosData.filter((e: Evento) => e.tipo === 'tarjeta_roja' && (e.equipo === partidoData.equipo_visitante || e.equipo_nombre === partidoData.equipo_visitante)).length,
            goleadores: {},
          },
        };
        setEstadisticas(statsBasicas);
      }

      // Cargar alineaciones desde microservicio
      try {
        let alineacionesData: Alineacion[] = [];
        
        try {
          // Corregir URL para dispositivo físico
          const alineacionesUrl = ALINEACIONES_URL.includes('localhost') 
            ? ALINEACIONES_URL.replace('http://localhost:5001', API_URL.replace(':5000', ':5001'))
            : ALINEACIONES_URL;
          
          console.log('🔍 Intentando cargar alineaciones desde:', `${alineacionesUrl}/alineaciones`);
          
          const alineacionesRes = await axios.get(`${alineacionesUrl}/alineaciones`, {
            params: { id_partido: partidoId },
            timeout: 5000,
        });
        
          // El microservicio devuelve un array plano de alineaciones
          const responseData = alineacionesRes.data;
          console.log('📦 Respuesta de alineaciones (raw):', JSON.stringify(responseData, null, 2));
          
          let alineacionesItems: AlineacionItem[] = [];
          
          // Procesar respuesta - puede venir como array directo o envuelto
          if (Array.isArray(responseData)) {
            alineacionesItems = responseData;
          } else if (responseData.alineaciones && Array.isArray(responseData.alineaciones)) {
            alineacionesItems = responseData.alineaciones;
          } else if (responseData.local && responseData.visitante) {
            // Formato del proxy del backend
            const localItems = Array.isArray(responseData.alineacion_local) 
              ? responseData.alineacion_local 
              : [];
            const visitanteItems = Array.isArray(responseData.alineacion_visitante) 
              ? responseData.alineacion_visitante 
              : [];
            alineacionesItems = [...localItems, ...visitanteItems];
          }
          
          console.log('📋 Alineaciones items procesados:', alineacionesItems.length);
          
          // Agrupar por equipo y separar titulares de suplentes
          const alineacionesPorEquipo: { [key: number]: { equipo: string; titulares: Jugador[]; suplentes: Jugador[]; formacion: string } } = {};
          
          alineacionesItems.forEach((item: AlineacionItem) => {
            const idEquipo = item.id_equipo;
            const equipoNombre = item.equipo_nombre || partidoData.equipo_local || partidoData.equipo_visitante || 'Equipo desconocido';
            
            if (!alineacionesPorEquipo[idEquipo]) {
              alineacionesPorEquipo[idEquipo] = {
                equipo: equipoNombre,
                titulares: [],
                suplentes: [],
                formacion: item.formacion || 'N/A',
              };
            }
            
            const jugador: Jugador = {
              nombre: item.jugador_nombre || 'Jugador desconocido',
              numero: item.dorsal || item.numero || 0,
              posicion: item.posicion || 'N/A',
              id_jugador: item.id_jugador,
              dorsal: item.dorsal,
              posicion_x: item.posicion_x,
              posicion_y: item.posicion_y,
            };
            
            if (item.titular) {
              alineacionesPorEquipo[idEquipo].titulares.push(jugador);
            } else {
              alineacionesPorEquipo[idEquipo].suplentes.push(jugador);
            }
            
            // Actualizar formación si está disponible
            if (item.formacion) {
              alineacionesPorEquipo[idEquipo].formacion = item.formacion;
            }
          });
          
          // Convertir a array y ordenar: primero local, luego visitante
          alineacionesData = Object.values(alineacionesPorEquipo).map((alineacion, index) => ({
            ...alineacion,
            id_equipo: Object.keys(alineacionesPorEquipo)[index] ? parseInt(Object.keys(alineacionesPorEquipo)[index]) : undefined,
          }));
          
          // Ordenar: local primero, visitante después
          alineacionesData.sort((a, b) => {
            const aIsLocal = a.id_equipo === partidoData.id_equipo_local || 
                            a.equipo === partidoData.equipo_local;
            const bIsLocal = b.id_equipo === partidoData.id_equipo_local || 
                            b.equipo === partidoData.equipo_local;
            if (aIsLocal && !bIsLocal) return -1;
            if (!aIsLocal && bIsLocal) return 1;
            return 0;
          });
          
          console.log('✅ Alineaciones procesadas y agrupadas:', alineacionesData.length);
          console.log('📊 Detalle:', alineacionesData.map(a => ({
            equipo: a.equipo,
            titulares: a.titulares.length,
            suplentes: a.suplentes.length,
            formacion: a.formacion,
          })));
          
          setAlineaciones(alineacionesData);
        } catch (error1: any) {
          console.error('❌ Error cargando alineaciones desde microservicio:', {
            message: error1.message,
            response: error1.response?.data,
            url: error1.config?.url,
          });
          
          // Si falla, intentar desde el proxy del backend
          try {
            const proxyRes = await axios.get(`${API_URL}/organizador/partidos/${partidoId}/alineaciones`, {
              timeout: 5000,
            });
            const proxyData = proxyRes.data;
            console.log('📦 Respuesta del proxy:', JSON.stringify(proxyData, null, 2));
            
            // El proxy devuelve alineacion_local y alineacion_visitante como arrays
            const localItems = Array.isArray(proxyData.alineacion_local) ? proxyData.alineacion_local : [];
            const visitanteItems = Array.isArray(proxyData.alineacion_visitante) ? proxyData.alineacion_visitante : [];
            
            const allItems = [...localItems, ...visitanteItems];
            
            // Procesar igual que antes
            const alineacionesPorEquipo: { [key: number]: { equipo: string; titulares: Jugador[]; suplentes: Jugador[]; formacion: string } } = {};
            
            allItems.forEach((item: AlineacionItem) => {
              const idEquipo = item.id_equipo;
              const equipoNombre = item.equipo_nombre || 
                                 (item.id_equipo === partidoData.id_equipo_local ? partidoData.equipo_local : partidoData.equipo_visitante) ||
                                 'Equipo desconocido';
              
              if (!alineacionesPorEquipo[idEquipo]) {
                alineacionesPorEquipo[idEquipo] = {
                  equipo: equipoNombre,
                  titulares: [],
                  suplentes: [],
                  formacion: item.formacion || 'N/A',
                };
              }
              
              const jugador: Jugador = {
                nombre: item.jugador_nombre || 'Jugador desconocido',
                numero: item.dorsal || 0,
                posicion: item.posicion || 'N/A',
                id_jugador: item.id_jugador,
                dorsal: item.dorsal,
                posicion_x: item.posicion_x,
                posicion_y: item.posicion_y,
              };
              
              if (item.titular) {
                alineacionesPorEquipo[idEquipo].titulares.push(jugador);
              } else {
                alineacionesPorEquipo[idEquipo].suplentes.push(jugador);
              }
              
              if (item.formacion) {
                alineacionesPorEquipo[idEquipo].formacion = item.formacion;
              }
            });
            
            alineacionesData = Object.values(alineacionesPorEquipo);
            
            // Ordenar: local primero
            alineacionesData.sort((a, b) => {
              const aIsLocal = a.equipo === partidoData.equipo_local;
              const bIsLocal = b.equipo === partidoData.equipo_local;
              if (aIsLocal && !bIsLocal) return -1;
              if (!aIsLocal && bIsLocal) return 1;
              return 0;
            });
            
            setAlineaciones(alineacionesData);
          } catch (error2) {
            console.log('⚠️ No hay alineaciones disponibles desde ningún endpoint');
            setAlineaciones([]);
          }
        }
      } catch (error) {
        console.error('❌ Error general cargando alineaciones:', error);
        setAlineaciones([]);
      }

    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadEquiposLogos = async (partidoData: PartidoDetail) => {
    try {
      const logos: EquipoLogo = {};
      
      // Cargar logo del equipo local
      if (partidoData.id_equipo_local) {
        try {
          const equipoLocalRes = await axios.get(`${API_URL}/equipos/${partidoData.id_equipo_local}`);
          let logoUrl = equipoLocalRes.data.logo_url || equipoLocalRes.data.equipo?.logo_url;
          
          if (logoUrl && logoUrl.includes('localhost')) {
            logoUrl = logoUrl.replace('http://localhost:5000', API_URL);
          }
          
          logos[partidoData.id_equipo_local] = logoUrl || null;
        } catch (error) {
          console.log(`Error cargando logo equipo local:`, error);
          logos[partidoData.id_equipo_local] = null;
        }
      }
      
      // Cargar logo del equipo visitante
      if (partidoData.id_equipo_visitante) {
        try {
          const equipoVisitanteRes = await axios.get(`${API_URL}/equipos/${partidoData.id_equipo_visitante}`);
          let logoUrl = equipoVisitanteRes.data.logo_url || equipoVisitanteRes.data.equipo?.logo_url;
          
          if (logoUrl && logoUrl.includes('localhost')) {
            logoUrl = logoUrl.replace('http://localhost:5000', API_URL);
          }
          
          logos[partidoData.id_equipo_visitante] = logoUrl || null;
        } catch (error) {
          console.log(`Error cargando logo equipo visitante:`, error);
          logos[partidoData.id_equipo_visitante] = null;
        }
      }
      
      setEquiposLogos(logos);
    } catch (error) {
      console.error('Error cargando logos de equipos:', error);
    }
  };

  const getLogoEquipo = (idEquipo?: number): string | null => {
    if (!idEquipo) return null;
    return equiposLogos[idEquipo] || null;
  };

  const formatFechaCompleta = (fecha: string) => {
    const date = new Date(fecha);
    return date.toLocaleDateString('es-EC', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const formatHora = (fecha: string) => {
    const date = new Date(fecha);
    return date.toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit', hour12: false });
  };

  const renderTabButton = (tab: TabType, label: string) => (
    <TouchableOpacity
      style={[styles.tabButton, activeTab === tab && styles.tabButtonActive]}
      onPress={() => setActiveTab(tab)}
    >
      <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
        {label}
      </Text>
      {activeTab === tab && <View style={styles.tabIndicator} />}
    </TouchableOpacity>
  );

  const renderEvento = (evento: Evento, index: number) => {
    const getIcono = () => {
      switch (evento.tipo) {
        case 'gol':
          return '⚽';
        case 'tarjeta_amarilla':
          return '🟨';
        case 'tarjeta_roja':
          return '🟥';
        case 'sustitucion':
          return '🔄';
        default:
          return '•';
      }
    };

    const getTitulo = () => {
      switch (evento.tipo) {
        case 'gol':
          return `¡GOL! - ${evento.equipo || evento.equipo_nombre || 'Equipo'}`;
        case 'tarjeta_amarilla':
          return `Tarjeta Amarilla - ${evento.equipo || evento.equipo_nombre || 'Equipo'}`;
        case 'tarjeta_roja':
          return `Tarjeta Roja - ${evento.equipo || evento.equipo_nombre || 'Equipo'}`;
        case 'sustitucion':
          return `Sustitución - ${evento.equipo || evento.equipo_nombre || 'Equipo'}`;
        default:
          return `Evento - ${evento.equipo || evento.equipo_nombre || 'Equipo'}`;
      }
    };

    const minuto = evento.minuto || 0;

    return (
      <View key={index} style={styles.eventoCard}>
        <View style={styles.eventoMinuto}>
          <Text style={styles.eventoMinutoText}>{minuto}'</Text>
        </View>
        <View style={styles.eventoIcono}>
          <Text style={styles.eventoIconoText}>{getIcono()}</Text>
        </View>
        <View style={styles.eventoContent}>
          <Text style={styles.eventoTitulo}>{getTitulo()}</Text>
          <Text style={styles.eventoJugador}>{evento.jugador || evento.jugador_nombre || 'Jugador desconocido'}</Text>
          {evento.detalle && (
            <Text style={styles.eventoDetalle}>{evento.detalle}</Text>
          )}
        </View>
      </View>
    );
  };

  const renderTimeline = () => {
    // Ordenar eventos por minuto (más recientes primero)
    const eventosOrdenados = [...eventos].sort((a, b) => {
      const minutoA = a.minuto || 0;
      const minutoB = b.minuto || 0;
      return minutoB - minutoA; // Descendente
    });

    return (
    <View style={styles.tabContent}>
        {eventosOrdenados.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>📋</Text>
          <Text style={styles.emptyText}>No hay eventos registrados</Text>
            <Text style={styles.emptyTextSub}>Los eventos del partido aparecerán aquí</Text>
        </View>
      ) : (
          eventosOrdenados.map((evento, index) => renderEvento(evento, index))
      )}
    </View>
  );
  };

  const renderEstadisticas = () => {
    if (!estadisticas) {
      return (
    <View style={styles.tabContent}>
      <View style={styles.emptyState}>
        <Text style={styles.emptyIcon}>📊</Text>
        <Text style={styles.emptyText}>Estadísticas no disponibles</Text>
      </View>
    </View>
  );
    }

    const statsLocal = estadisticas.local || {};
    const statsVisitante = estadisticas.visitante || {};

    return (
    <View style={styles.tabContent}>
        {/* Estadísticas por Equipo */}
        <View style={styles.estadisticasContainer}>
          {/* Equipo Local */}
          <View style={styles.estadisticasEquipo}>
            <Text style={styles.estadisticasEquipoNombre}>{partido?.equipo_local}</Text>
            <View style={styles.estadisticasRow}>
              <View style={styles.estadisticaItem}>
                <Text style={styles.estadisticaValor}>{statsLocal.goles || 0}</Text>
                <Text style={styles.estadisticaLabel}>Goles</Text>
              </View>
              <View style={styles.estadisticaItem}>
                <Text style={styles.estadisticaValor}>{statsLocal.tarjetas_amarillas || 0}</Text>
                <Text style={styles.estadisticaLabel}>🟨 Amarillas</Text>
              </View>
              <View style={styles.estadisticaItem}>
                <Text style={styles.estadisticaValor}>{statsLocal.tarjetas_rojas || 0}</Text>
                <Text style={styles.estadisticaLabel}>🟥 Rojas</Text>
              </View>
            </View>
          </View>

          {/* Equipo Visitante */}
          <View style={styles.estadisticasEquipo}>
            <Text style={styles.estadisticasEquipoNombre}>{partido?.equipo_visitante}</Text>
            <View style={styles.estadisticasRow}>
              <View style={styles.estadisticaItem}>
                <Text style={styles.estadisticaValor}>{statsVisitante.goles || 0}</Text>
                <Text style={styles.estadisticaLabel}>Goles</Text>
              </View>
              <View style={styles.estadisticaItem}>
                <Text style={styles.estadisticaValor}>{statsVisitante.tarjetas_amarillas || 0}</Text>
                <Text style={styles.estadisticaLabel}>🟨 Amarillas</Text>
              </View>
              <View style={styles.estadisticaItem}>
                <Text style={styles.estadisticaValor}>{statsVisitante.tarjetas_rojas || 0}</Text>
                <Text style={styles.estadisticaLabel}>🟥 Rojas</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Goleadores */}
        {(statsLocal.goleadores && Object.keys(statsLocal.goleadores).length > 0) ||
         (statsVisitante.goleadores && Object.keys(statsVisitante.goleadores).length > 0) ? (
          <View style={styles.goleadoresContainer}>
            <Text style={styles.goleadoresTitulo}>⚽ Goleadores</Text>
            
            {statsLocal.goleadores && Object.keys(statsLocal.goleadores).length > 0 && (
              <View style={styles.goleadoresEquipo}>
                <Text style={styles.goleadoresEquipoNombre}>{partido?.equipo_local}</Text>
                {Object.entries(statsLocal.goleadores).map(([jugador, goles]: [string, any]) => (
                  <View key={jugador} style={styles.goleadorRow}>
                    <Text style={styles.goleadorNombre}>{jugador}</Text>
                    <Text style={styles.goleadorGoles}>{goles} {goles === 1 ? 'gol' : 'goles'}</Text>
                  </View>
                ))}
              </View>
            )}

            {statsVisitante.goleadores && Object.keys(statsVisitante.goleadores).length > 0 && (
              <View style={styles.goleadoresEquipo}>
                <Text style={styles.goleadoresEquipoNombre}>{partido?.equipo_visitante}</Text>
                {Object.entries(statsVisitante.goleadores).map(([jugador, goles]: [string, any]) => (
                  <View key={jugador} style={styles.goleadorRow}>
                    <Text style={styles.goleadorNombre}>{jugador}</Text>
                    <Text style={styles.goleadorGoles}>{goles} {goles === 1 ? 'gol' : 'goles'}</Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        ) : null}
      </View>
    );
  };

  const renderAlineaciones = () => {
    if (alineaciones.length === 0) {
      return (
        <View style={styles.tabContent}>
        <View style={styles.emptyState}>
          <Text style={styles.emptyIcon}>👥</Text>
          <Text style={styles.emptyText}>No hay alineaciones disponibles</Text>
        </View>
        </View>
      );
    }

    // Normalizar y ordenar alineaciones: primero local, luego visitante
    const alineacionesNormalizadas = alineaciones.map(alineacion => ({
      equipo: alineacion.equipo || 'Equipo desconocido',
      id_equipo: alineacion.id_equipo,
      titulares: Array.isArray(alineacion.titulares) ? alineacion.titulares : [],
      suplentes: Array.isArray(alineacion.suplentes) ? alineacion.suplentes : [],
      formacion: alineacion.formacion || 'N/A',
    }));

    // Ordenar: primero el equipo local, luego el visitante
    const alineacionLocal = alineacionesNormalizadas.find(
      a => a.id_equipo === partido?.id_equipo_local || 
           a.equipo === partido?.equipo_local
    ) || alineacionesNormalizadas[0];

    const alineacionVisitante = alineacionesNormalizadas.find(
      a => a.id_equipo === partido?.id_equipo_visitante || 
           a.equipo === partido?.equipo_visitante
    ) || alineacionesNormalizadas[1] || alineacionesNormalizadas[0];

    const alineacionesOrdenadas = [];
    if (alineacionLocal && alineacionLocal !== alineacionVisitante) {
      alineacionesOrdenadas.push(alineacionLocal);
    }
    if (alineacionVisitante && alineacionVisitante !== alineacionLocal) {
      alineacionesOrdenadas.push(alineacionVisitante);
    }
    // Si no se encontraron por ID/nombre, usar todas las disponibles
    if (alineacionesOrdenadas.length === 0) {
      alineacionesOrdenadas.push(...alineacionesNormalizadas);
    }

    return (
      <View style={styles.tabContent}>
        {alineacionesOrdenadas.map((alineacion, index) => {
          // Filtrar jugadores con posiciones para mostrar en cancha
          const jugadoresConPosicion = alineacion.titulares.filter(j => 
            j.posicion_x !== undefined && j.posicion_y !== undefined &&
            j.posicion_x !== null && j.posicion_y !== null
          );
          
          return (
          <View key={index} style={styles.alineacionContainer}>
            <Text style={styles.alineacionEquipo}>{alineacion.equipo}</Text>
            <Text style={styles.alineacionFormacion}>Formación: {alineacion.formacion}</Text>

              {/* Visualización tipo cancha si hay jugadores con posiciones */}
              {jugadoresConPosicion.length > 0 && (
                <View style={styles.canchaContainer}>
                  <View style={styles.cancha}>
                    {jugadoresConPosicion.map((jugador, jIndex) => {
                      // Convertir posiciones de 0-100 a porcentajes
                      const left = `${jugador.posicion_x || 50}%`;
                      const top = `${jugador.posicion_y || 50}%`;
                      
                      return (
                        <View
                          key={jIndex}
                          style={[
                            styles.jugadorCancha,
                            {
                              position: 'absolute',
                              left: left,
                              top: top,
                              marginLeft: -25,
                              marginTop: -25,
                            },
                          ]}
                        >
                          <View style={styles.jugadorCanchaNumero}>
                            <Text style={styles.jugadorCanchaNumeroText}>
                              {jugador.numero || jugador.dorsal || '?'}
                            </Text>
                          </View>
                          <Text style={styles.jugadorCanchaNombre} numberOfLines={1}>
                            {jugador.nombre || 'Jugador'}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Lista de titulares - SIEMPRE mostrar todos */}
            <Text style={styles.alineacionSubtitulo}>Titulares</Text>
              {alineacion.titulares && alineacion.titulares.length > 0 ? (
                alineacion.titulares.map((jugador, jIndex) => (
              <View key={jIndex} style={styles.jugadorRow}>
                <View style={styles.jugadorNumero}>
                      <Text style={styles.jugadorNumeroText}>
                        {jugador.numero || jugador.dorsal || '?'}
                      </Text>
                </View>
                    <Text style={styles.jugadorNombre}>
                      {jugador.nombre || 'Jugador desconocido'}
                    </Text>
                    <Text style={styles.jugadorPosicion}>
                      {jugador.posicion || 'N/A'}
                    </Text>
              </View>
                ))
              ) : (
                <Text style={styles.emptyJugadores}>No hay titulares registrados</Text>
              )}

              {/* Lista de suplentes */}
            <Text style={styles.alineacionSubtitulo}>Suplentes</Text>
              {alineacion.suplentes && alineacion.suplentes.length > 0 ? (
                alineacion.suplentes.map((jugador, jIndex) => (
              <View key={jIndex} style={styles.jugadorRow}>
                <View style={styles.jugadorNumero}>
                      <Text style={styles.jugadorNumeroText}>
                        {jugador.numero || jugador.dorsal || '?'}
                      </Text>
                </View>
                    <Text style={styles.jugadorNombre}>
                      {jugador.nombre || 'Jugador desconocido'}
                    </Text>
                    <Text style={styles.jugadorPosicion}>
                      {jugador.posicion || 'N/A'}
                    </Text>
          </View>
        ))
              ) : (
                <Text style={styles.emptyJugadores}>No hay suplentes registrados</Text>
      )}
    </View>
  );
        })}
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

  if (!partido) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>Partido no encontrado</Text>
        <TouchableOpacity style={styles.backButtonAlt} onPress={onBack}>
          <Text style={styles.backButtonAltText}>Volver</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const fecha = partido.fecha_partido || partido.fecha_hora || '';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={onBack}>
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detalle de Partido</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Fecha y detalles */}
      <View style={styles.detailsContainer}>
        <Text style={styles.fecha}>
          {formatFechaCompleta(fecha)} - {formatHora(fecha)}
        </Text>
        <Text style={styles.campeonato}>
          {partido.lugar} - {partido.campeonato?.nombre || 'Campeonato'} - Jornada {partido.jornada}
        </Text>
      </View>

      {/* Marcador */}
      <View style={styles.marcadorContainer}>
        <View style={styles.equipoLarge}>
          {getLogoEquipo(partido.id_equipo_local) ? (
            <Image 
              source={{ uri: getLogoEquipo(partido.id_equipo_local)! }} 
              style={styles.escudoImageLarge}
              onError={(error) => {
                console.warn('Error cargando logo equipo local:', getLogoEquipo(partido.id_equipo_local));
              }}
            />
          ) : (
          <View style={styles.escudoLarge}>
            <Text style={styles.escudoText}>{partido.equipo_local.charAt(0).toUpperCase()}</Text>
          </View>
          )}
          <Text style={styles.equipoNombreLarge}>{partido.equipo_local}</Text>
        </View>

        <View style={styles.marcadorLarge}>
          <Text style={styles.marcadorText}>
            {partido.goles_local ?? 0} - {partido.goles_visitante ?? 0}
          </Text>
          {partido.estado === 'en_juego' && (
            <Text style={styles.minutoActual}>82'</Text>
          )}
        </View>

        <View style={styles.equipoLarge}>
          {getLogoEquipo(partido.id_equipo_visitante) ? (
            <Image 
              source={{ uri: getLogoEquipo(partido.id_equipo_visitante)! }} 
              style={styles.escudoImageLarge}
              onError={(error) => {
                console.warn('Error cargando logo equipo visitante:', getLogoEquipo(partido.id_equipo_visitante));
              }}
            />
          ) : (
          <View style={styles.escudoLarge}>
            <Text style={styles.escudoText}>{partido.equipo_visitante.charAt(0).toUpperCase()}</Text>
          </View>
          )}
          <Text style={styles.equipoNombreLarge}>{partido.equipo_visitante}</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsContainer}>
        {renderTabButton('timeline', 'TIMELINE')}
        {renderTabButton('estadisticas', 'ESTADÍSTICAS')}
        {renderTabButton('alineaciones', 'ALINEACIONES')}
      </View>

      {/* Contenido */}
      <ScrollView style={styles.content}>
        {activeTab === 'timeline' && renderTimeline()}
        {activeTab === 'estadisticas' && renderEstadisticas()}
        {activeTab === 'alineaciones' && renderAlineaciones()}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
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
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212121',
  },
  detailsContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  fecha: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212121',
    marginBottom: 4,
  },
  campeonato: {
    fontSize: 14,
    color: colors.primary,
  },
  marcadorContainer: {
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
  },
  equipoLarge: {
    flex: 1,
    alignItems: 'center',
  },
  escudoLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  escudoImageLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: '#E0E0E0',
    marginBottom: 12,
  },
  escudoText: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  equipoNombreLarge: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212121',
    textAlign: 'center',
  },
  marcadorLarge: {
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  marcadorText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#212121',
  },
  minutoActual: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 8,
  },
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
  content: {
    flex: 1,
  },
  tabContent: {
    padding: 24,
  },
  eventoCard: {
    flexDirection: 'row',
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
  eventoMinuto: {
    width: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventoMinutoText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
  },
  eventoIcono: {
    width: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eventoIconoText: {
    fontSize: 24,
  },
  eventoContent: {
    flex: 1,
  },
  eventoTitulo: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212121',
    marginBottom: 4,
  },
  eventoJugador: {
    fontSize: 14,
    color: '#616161',
    marginBottom: 2,
  },
  eventoDetalle: {
    fontSize: 12,
    color: '#9E9E9E',
  },
  alineacionContainer: {
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
  alineacionEquipo: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212121',
    marginBottom: 4,
  },
  alineacionFormacion: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
    marginBottom: 16,
  },
  alineacionSubtitulo: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#757575',
    marginTop: 8,
    marginBottom: 8,
  },
  jugadorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  jugadorNumero: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  jugadorNumeroText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  jugadorNombre: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#212121',
  },
  jugadorPosicion: {
    fontSize: 12,
    color: '#757575',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  emptyJugadores: {
    fontSize: 14,
    color: '#9E9E9E',
    fontStyle: 'italic',
    paddingVertical: 12,
    textAlign: 'center',
  },
  canchaContainer: {
    marginVertical: 16,
    alignItems: 'center',
  },
  cancha: {
    width: '100%',
    height: 300,
    backgroundColor: '#4CAF50',
    borderRadius: 12,
    position: 'relative',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    overflow: 'hidden',
  },
  jugadorCancha: {
    alignItems: 'center',
    width: 40,
  },
  jugadorCanchaNumero: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  jugadorCanchaNumeroText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.primary,
  },
  jugadorCanchaNombre: {
    fontSize: 9,
    color: '#FFFFFF',
    fontWeight: '600',
    textAlign: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    maxWidth: 60,
    minWidth: 40,
  },
  infoText: {
    fontSize: 12,
    color: '#757575',
    fontStyle: 'italic',
    paddingVertical: 8,
    textAlign: 'center',
  },
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
  emptyTextSub: {
    fontSize: 12,
    color: '#9E9E9E',
    textAlign: 'center',
    marginTop: 4,
  },
  estadisticasContainer: {
    gap: 16,
    marginBottom: 24,
  },
  estadisticasEquipo: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  estadisticasEquipoNombre: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#212121',
    marginBottom: 12,
    textAlign: 'center',
  },
  estadisticasRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  estadisticaItem: {
    alignItems: 'center',
  },
  estadisticaValor: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 4,
  },
  estadisticaLabel: {
    fontSize: 12,
    color: '#757575',
  },
  goleadoresContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  goleadoresTitulo: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212121',
    marginBottom: 16,
  },
  goleadoresEquipo: {
    marginBottom: 16,
  },
  goleadoresEquipoNombre: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 8,
  },
  goleadorRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  goleadorNombre: {
    fontSize: 14,
    fontWeight: '600',
    color: '#212121',
  },
  goleadorGoles: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: 'bold',
  },
});