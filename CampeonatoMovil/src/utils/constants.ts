// src/utils/constants.ts
import { Platform } from 'react-native';


const LOCAL_IP = '10.20.139.22'; // ✅ Tu IP de la red local
const PORT = '5000';

const getBaseURL = () => {
  if (__DEV__) {
    console.log('📱 Platform:', Platform.OS);

    if (Platform.OS === 'android') {
      // Usamos adb reverse en emulador o dispositivo físico:
      // adb reverse tcp:5000 tcp:5000
      // Entonces el backend es accesible como localhost/127.0.0.1 desde el teléfono
      console.log('🤖 Android con adb reverse');
      return `http://127.0.0.1:${PORT}`;
    } else if (Platform.OS === 'ios') {
      const isSimulator = true; // cambia a false si usas iPhone físico
      
      if (isSimulator) {
        console.log('🍎 iOS Simulator detectado');
        return `http://localhost:${PORT}`;
      } else {
        console.log('📱 Dispositivo iOS físico detectado');
        return `http://${LOCAL_IP}:${PORT}`;
      }
    } else {
      // Web u otras plataformas
      return `http://${LOCAL_IP}:${PORT}`;
    }
  }

  // PRODUCCIÓN – cambia esta URL cuando subas el backend a un servidor público
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