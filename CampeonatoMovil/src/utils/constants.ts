import { Platform } from 'react-native';

const LOCAL_IP = '10.20.139.22'; 
const PORT = '5000';

const getBaseURL = () => {
  if (__DEV__) {
    console.log('📱 Platform:', Platform.OS);

    if (Platform.OS === 'android') {
      console.log('🤖 Android con adb reverse');
      return `http://127.0.0.1:${PORT}`;
    } else if (Platform.OS === 'ios') {
      const isSimulator = true; 
      
      if (isSimulator) {
        console.log('🍎 iOS Simulator detectado');
        return `http://localhost:${PORT}`;
      } else {
        console.log('📱 Dispositivo iOS físico detectado');
        return `http://${LOCAL_IP}:${PORT}`;
      }
    } else {
      return `http://${LOCAL_IP}:${PORT}`;
    }
  }
  return 'https://tu-api-produccion.com';
};

export const API_BASE_URL = getBaseURL();

console.log('🌐 API_BASE_URL configurada:', API_BASE_URL);

export const API_ENDPOINTS = {
  CAMPEONATOS: '/campeonatos',
  CAMPEONATOS_PUBLICOS: '/campeonatos/publicos',
  PARTIDOS: '/partidos',
  EQUIPOS: '/equipos',
  JUGADORES: '/jugadores',
  TABLA_POSICIONES: '/estadisticas/tabla-posiciones',
  GOLEADORES: (id: number) => `/estadisticas/goleadores/${id}`,
  TARJETAS: (id: number) => `/estadisticas/tarjetas/${id}`,
};

export const API_TIMEOUT = 15000; // 15 segundos