// src/services/api.ts
import axios from 'axios';
import { API_BASE_URL } from '../utils/constants';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Servicios
export const campeonatoService = {
  getPublicos: () => api.get('/campeonatos/publicos'),
  getById: (id: number) => api.get(`/campeonatos/${id}`),
};

export const partidoService = {
  getByCampeonato: (id: number) => api.get(`/partidos?campeonato_id=${id}`),
  getById: (id: number) => api.get(`/partidos/${id}`),
};

export const estadisticasService = {
  getTablaPosiciones: (id: number) => 
    api.get(`/estadisticas/tabla-posiciones/${id}`),
  getGoleadores: (id: number) => 
    api.get(`/estadisticas/goleadores/${id}`),
};

export default api;