// src/screens/OnboardingScreen.tsx
import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Dimensions,
  Image,
} from 'react-native';
import { CustomButton } from '../components/CustomButton';
import { colors } from '../theme/colors';

const { width } = Dimensions.get('window');

interface OnboardingSlide {
  id: string;
  image: any;
  title: string;
  description: string;
}

const slides: OnboardingSlide[] = [
  {
    id: '1',
    image: require('../assets/onboarding1.png'), // Reemplazar con tu imagen
    title: 'Sigue tus campeonatos favoritos',
    description: 'Accede a resultados, tablas y estadísticas en tiempo real',
  },
  {
    id: '2',
    image: require('../assets/onboarding2.png'),
    title: 'No te pierdas ningún partido',
    description: 'Consulta horarios, sedes y recibe notificaciones',
  },
  {
    id: '3',
    image: require('../assets/onboarding3.png'),
    title: 'Analiza el rendimiento',
    description: 'Goleadores, tarjetas, historial completo',
  },
];

interface OnboardingScreenProps {
  onFinish: () => void;
}

export const OnboardingScreen: React.FC<OnboardingScreenProps> = ({
  onFinish,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = useRef<FlatList>(null);

  const handleNext = () => {
    if (currentIndex < slides.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1 });
      setCurrentIndex(currentIndex + 1);
    } else {
      onFinish();
    }
  };

  const handleSkip = () => {
    onFinish();
  };

  const renderSlide = ({ item }: { item: OnboardingSlide }) => (
    <View style={styles.slide}>
      <Image source={item.image} style={styles.image} resizeMode="contain" />
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.description}>{item.description}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={slides}
        renderItem={renderSlide}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item) => item.id}
        onMomentumScrollEnd={(event) => {
          const index = Math.round(event.nativeEvent.contentOffset.x / width);
          setCurrentIndex(index);
        }}
      />

      <View style={styles.pagination}>
        {slides.map((_, index) => (
          <View
            key={index}
            style={[
              styles.dot,
              index === currentIndex ? styles.activeDot : styles.inactiveDot,
            ]}
          />
        ))}
      </View>

      <View style={styles.buttonsContainer}>
        <CustomButton
          title={currentIndex === slides.length - 1 ? 'Comenzar' : 'Siguiente'}
          onPress={handleNext}
          variant="primary"
        />
        {currentIndex < slides.length - 1 && (
          <CustomButton
            title="Saltar"
            onPress={handleSkip}
            variant="secondary"
          />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  slide: {
    width,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  image: {
    width: width * 0.7,
    height: width * 0.7,
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginHorizontal: 4,
  },
  activeDot: {
    backgroundColor: colors.primary,
    width: 24,
  },
  inactiveDot: {
    backgroundColor: colors.border,
  },
  buttonsContainer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    gap: 12,
  },
});