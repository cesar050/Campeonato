// src/screens/HomeScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { campeonatoService } from '../services/api';
import { Campeonato } from '../types';

export const HomeScreen = () => {
  const [campeonatos, setCampeonatos] = useState<Campeonato[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadCampeonatos();
  }, []);

  const loadCampeonatos = async () => {
    try {
      setLoading(true);
      setError('');
      const { data } = await campeonatoService.getPublicos();
      console.log('Datos recibidos:', data);
      setCampeonatos(data.campeonatos || []);
    } catch (err) {
      console.error('Error al cargar campeonatos:', err);
      setError('No se pudieron cargar los campeonatos');
    } finally {
      setLoading(false);
    }
  };

  const renderCampeonato = ({ item }: { item: Campeonato }) => (
    <TouchableOpacity style={styles.card}>
      <View style={styles.info}>
        <Text style={styles.nombre}>{item.nombre || 'Sin nombre'}</Text>
        <Text style={styles.deporte}>
          {item.deporte_tipo === 'futbol' ? 'Futbol' : 'Indoor'}
        </Text>
        <Text style={styles.fechas}>
          {item.fecha_inicio || 'Sin fecha'} - {item.fecha_fin || 'Sin fecha'}
        </Text>
        <View style={[styles.badge, getEstadoColor(item.estado)]}>
          <Text style={styles.badgeText}>{item.estado || 'Sin estado'}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'en_curso':
        return styles.badgeEnCurso;
      case 'finalizado':
        return styles.badgeFinalizado;
      default:
        return styles.badgePlanificacion;
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Cargando campeonatos...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>X {error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadCampeonatos}>
          <Text style={styles.retryText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Campeonatos Loja</Text>
      <FlatList
        data={campeonatos}
        keyExtractor={(item, index) => item?.id?.toString() || index.toString()}
        renderItem={renderCampeonato}
        contentContainerStyle={styles.list}
        refreshing={loading}
        onRefresh={loadCampeonatos}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    padding: 16,
    backgroundColor: '#4CAF50',
    color: 'white',
  },
  list: {
    padding: 16,
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  info: {
    flex: 1,
  },
  nombre: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  deporte: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  fechas: {
    fontSize: 12,
    color: '#999',
    marginBottom: 8,
  },
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
  },
  badgeEnCurso: {
    backgroundColor: '#4CAF50',
  },
  badgeFinalizado: {
    backgroundColor: '#9E9E9E',
  },
  badgePlanificacion: {
    backgroundColor: '#2196F3',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    fontSize: 16,
    color: '#f44336',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});