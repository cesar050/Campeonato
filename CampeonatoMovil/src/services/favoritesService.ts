// src/services/favoritesService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Campeonato, Equipo } from '../types';

const FAVORITES_KEY = '@favorites';

interface Favorites {
  campeonatos: Campeonato[];
  equipos: Equipo[];
}

export const favoritesService = {
  async getFavorites(): Promise<Favorites> {
    try {
      const jsonValue = await AsyncStorage.getItem(FAVORITES_KEY);
      return jsonValue != null ? JSON.parse(jsonValue) : { campeonatos: [], equipos: [] };
    } catch (error) {
      console.error('Error al obtener favoritos:', error);
      return { campeonatos: [], equipos: [] };
    }
  },

  async saveFavorites(favorites: Favorites): Promise<void> {
    try {
      const jsonValue = JSON.stringify(favorites);
      await AsyncStorage.setItem(FAVORITES_KEY, jsonValue);
    } catch (error) {
      console.error('Error al guardar favoritos:', error);
      throw error;
    }
  },

  async addCampeonato(campeonato: Campeonato): Promise<void> {
    const favorites = await this.getFavorites();
    const exists = favorites.campeonatos.some((c) => c.id === campeonato.id);
    if (!exists) {
      favorites.campeonatos.push(campeonato);
      await this.saveFavorites(favorites);
    }
  },

  async removeCampeonato(campeonatoId: number): Promise<void> {
    const favorites = await this.getFavorites();
    favorites.campeonatos = favorites.campeonatos.filter((c) => c.id !== campeonatoId);
    await this.saveFavorites(favorites);
  },

  async isCampeonatoFavorite(campeonatoId: number): Promise<boolean> {
    const favorites = await this.getFavorites();
    return favorites.campeonatos.some((c) => c.id === campeonatoId);
  },

  async addEquipo(equipo: Equipo): Promise<void> {
    const favorites = await this.getFavorites();
    const exists = favorites.equipos.some((e) => e.id === equipo.id);
    if (!exists) {
      favorites.equipos.push(equipo);
      await this.saveFavorites(favorites);
    }
  },

  async removeEquipo(equipoId: number): Promise<void> {
    const favorites = await this.getFavorites();
    favorites.equipos = favorites.equipos.filter((e) => e.id !== equipoId);
    await this.saveFavorites(favorites);
  },

  async isEquipoFavorite(equipoId: number): Promise<boolean> {
    const favorites = await this.getFavorites();
    return favorites.equipos.some((e) => e.id === equipoId);
  },
};
