// src/services/api.ts
import axios, { AxiosError } from 'axios';
import { API_BASE_URL } from '../utils/constants';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para manejo de errores
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    console.error('API Error:', error.message);
    return Promise.reject(error);
  }
);

export const campeonatoService = {
  getPublicos: () => api.get('/campeonatos/publicos'),
  getById: (id: number) => api.get(`/campeonatos/${id}`),
};

export const partidoService = {
  getByCampeonato: (campeonatoId: number) => 
    api.get(`/partidos?campeonato_id=${campeonatoId}`),
  getById: (id: number) => api.get(`/partidos/${id}`),
  getAll: () => api.get('/partidos'),
};

export const equipoService = {
  getById: (id: number) => api.get(`/equipos/${id}`),
};

export const jugadorService = {
  getByEquipo: (equipoId: number) => 
    api.get(`/jugadores?equipo_id=${equipoId}`),
};

export const estadisticasService = {
  getTablaPosiciones: (campeonatoId: number) => 
    api.get(`/estadisticas/tabla-posiciones/${campeonatoId}`),
  getGoleadores: (campeonatoId: number) => 
    api.get(`/estadisticas/goleadores/${campeonatoId}`),
  getTarjetas: (campeonatoId: number) => 
    api.get(`/estadisticas/tarjetas/${campeonatoId}`),
};

export default api;