// src/utils/constants.ts

// IMPORTANTE: Cambiar por la IP de tu PC en la red local
// Para encontrar tu IP en Ubuntu:
// Terminal: ip addr show | grep "inet " | grep -v 127.0.0.1

export const API_BASE_URL = 'http://192.168.110.223:5000';// ← CAMBIAR POR TU IP

export const API_ENDPOINTS = {
  CAMPEONATOS_PUBLICOS: '/campeonatos/publicos',
  PARTIDOS: '/partidos',
  EQUIPOS: '/equipos',
  TABLA_POSICIONES: (id: number) => `/estadisticas/tabla-posiciones/${id}`,
  GOLEADORES: (id: number) => `/estadisticas/goleadores/${id}`,
};