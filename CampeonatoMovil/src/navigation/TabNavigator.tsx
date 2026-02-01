import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, BackHandler, Platform } from 'react-native';
import { HomeScreen } from '../screens/HomeScreen';
import { CampeonatosScreen } from '../screens/CampeonatosScreen';
import { CampeonatoDetailScreen } from '../screens/CampeonatoDetailScreen';
import { PartidosScreen } from '../screens/PartidosScreen';
import { PartidoDetailScreen } from '../screens/PartidoDetailScreen';
import { EquiposScreen } from '../screens/EquiposScreen';
import { EquipoDetailScreen } from '../screens/EquipoDetailScreen';
import { FavoritosScreen } from '../screens/FavoritosScreen';
import { colors } from '../theme/colors';

type TabName = 'Inicio' | 'Campeonatos' | 'Partidos' | 'Equipos' | 'Favoritos';

export const TabNavigator: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabName>('Inicio');
  const [selectedCampeonatoId, setSelectedCampeonatoId] = useState<number | null>(null);
  const [selectedPartidoId, setSelectedPartidoId] = useState<number | null>(null);
  const [selectedEquipoId, setSelectedEquipoId] = useState<number | null>(null);

  const handleSelectCampeonato = (id: number) => {
    setSelectedCampeonatoId(id);
  };

  const handleBackFromCampeonato = () => {
    setSelectedCampeonatoId(null);
  };

  const handleSelectPartido = (id: number) => {
    setSelectedPartidoId(id);
  };

  const handleBackFromPartido = () => {
    setSelectedPartidoId(null);
  };

  const handleSelectEquipo = (id: number) => {
    setSelectedEquipoId(id);
  };

  const handleBackFromEquipo = () => {
    setSelectedEquipoId(null);
  };

  // Manejar el botón de atrás del hardware
  useEffect(() => {
    // Solo en Android
    if (Platform.OS !== 'android') {
      return;
    }

    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      // Si hay una pantalla de detalle abierta, cerrarla
      if (selectedEquipoId) {
        handleBackFromEquipo();
        return true; // Indica que manejamos el evento
      }
      
      if (selectedPartidoId) {
        handleBackFromPartido();
        return true;
      }
      
      if (selectedCampeonatoId) {
        handleBackFromCampeonato();
        return true;
      }
      
      // Si no hay pantalla de detalle, permitir el comportamiento por defecto
      // (que sería salir de la app)
      return false;
    });

    // Limpiar el listener cuando el componente se desmonte
    return () => backHandler.remove();
  }, [selectedCampeonatoId, selectedPartidoId, selectedEquipoId]);

  const renderScreen = () => {
    // Prioridad a vistas de detalle
    if (selectedCampeonatoId) {
      return (
        <CampeonatoDetailScreen
          campeonatoId={selectedCampeonatoId}
          onBack={handleBackFromCampeonato}
        />
      );
    }

    if (selectedPartidoId) {
      return (
        <PartidoDetailScreen
          partidoId={selectedPartidoId}
          onBack={handleBackFromPartido}
        />
      );
    }

    if (selectedEquipoId) {
      return (
        <EquipoDetailScreen
          equipoId={selectedEquipoId}
          onBack={handleBackFromEquipo}
        />
      );
    }

    // Pantallas principales
    switch (activeTab) {
      case 'Inicio':
        return (
          <HomeScreen 
            onNavigateToCampeonato={handleSelectCampeonato}
            onNavigateToPartido={handleSelectPartido}
          />
        );
      case 'Campeonatos':
        return <CampeonatosScreen onSelectCampeonato={handleSelectCampeonato} />;
      case 'Partidos':
        return <PartidosScreen onSelectPartido={handleSelectPartido} />;
      case 'Equipos':
        return <EquiposScreen onSelectEquipo={handleSelectEquipo} />;
      case 'Favoritos':
        return <FavoritosScreen />;
      default:
        return (
          <HomeScreen 
            onNavigateToCampeonato={handleSelectCampeonato}
            onNavigateToPartido={handleSelectPartido}
          />
        );
    }
  };

  const renderIcon = (tab: TabName) => {
    const iconStyle = [styles.iconText, activeTab === tab && styles.iconTextActive];
    
    switch (tab) {
      case 'Inicio':
        return <Text style={iconStyle}>⌂</Text>;
      case 'Campeonatos':
        return <Text style={iconStyle}>♛</Text>;
      case 'Partidos':
        return <Text style={iconStyle}>●</Text>;
      case 'Equipos':
        return <Text style={iconStyle}>⚉</Text>;
      case 'Favoritos':
        return <Text style={iconStyle}>★</Text>;
      default:
        return <Text style={iconStyle}>●</Text>;
    }
  };

  const showTabBar = !selectedCampeonatoId && !selectedPartidoId && !selectedEquipoId;

  return (
    <View style={styles.container}>
      <View style={styles.screenContainer}>{renderScreen()}</View>

      {/* Bottom Navigation - Solo mostrar si NO estamos en detalle */}
      {showTabBar && (
        <View style={styles.tabBar}>
          <TabButton
            icon={() => renderIcon('Inicio')}
            label="Inicio"
            isActive={activeTab === 'Inicio'}
            onPress={() => setActiveTab('Inicio')}
          />
          <TabButton
            icon={() => renderIcon('Campeonatos')}
            label="Campeonatos"
            isActive={activeTab === 'Campeonatos'}
            onPress={() => setActiveTab('Campeonatos')}
          />
          <TabButton
            icon={() => renderIcon('Partidos')}
            label="Partidos"
            isActive={activeTab === 'Partidos'}
            onPress={() => setActiveTab('Partidos')}
          />
          <TabButton
            icon={() => renderIcon('Equipos')}
            label="Equipos"
            isActive={activeTab === 'Equipos'}
            onPress={() => setActiveTab('Equipos')}
          />
          <TabButton
            icon={() => renderIcon('Favoritos')}
            label="Favoritos"
            isActive={activeTab === 'Favoritos'}
            onPress={() => setActiveTab('Favoritos')}
          />
        </View>
      )}
    </View>
  );
};

interface TabButtonProps {
  icon: () => React.ReactNode;
  label: string;
  isActive: boolean;
  onPress: () => void;
}

const TabButton: React.FC<TabButtonProps> = ({ icon, label, isActive, onPress }) => {
  return (
    <TouchableOpacity
      style={styles.tabButton}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {isActive && <View style={styles.activeIndicator} />}
      {icon()}
      <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]} numberOfLines={1}>
        {label}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  screenContainer: {
    flex: 1,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    height: 65,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    paddingBottom: 5,
    paddingTop: 8,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  activeIndicator: {
    position: 'absolute',
    top: 0,
    left: '20%',
    right: '20%',
    height: 3,
    backgroundColor: colors.primary,
    borderRadius: 2,
  },
  iconText: {
    fontSize: 24,
    color: '#9E9E9E',
    marginBottom: 2,
  },
  iconTextActive: {
    color: colors.primary,
  },
  tabLabel: {
    fontSize: 10,
    color: '#9E9E9E',
    fontWeight: '500',
  },
  tabLabelActive: {
    color: colors.primary,
    fontWeight: '700',
  },
});