import React, { useState, useEffect } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  View,
  Alert,
  Platform,
  PermissionsAndroid,
  Animated,
  NativeModules,
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Voice, { SpeechResultsEvent, SpeechErrorEvent } from '@react-native-community/voice';
import { colors } from '../theme/colors';
import { diagnoseVoiceModule, printDiagnostics } from '../utils/voiceDiagnostics';

interface Props {
  onCommandReceived: (text: string) => void;
  disabled?: boolean;
}

export const VoiceSearchButton: React.FC<Props> = ({ onCommandReceived, disabled = false }) => {
  const [isListening, setIsListening] = useState(false);
  const [partialResults, setPartialResults] = useState<string>('');
  const [voiceAvailable, setVoiceAvailable] = useState(false);
  const scaleAnim = useState(new Animated.Value(1))[0];

  useEffect(() => {
    // El módulo nativo se llama "RCTVoice" en NativeModules, pero el wrapper de JS lo expone como "Voice"
    // Verificar ambos nombres por si acaso
    const VoiceNativeModule = NativeModules.RCTVoice || NativeModules.Voice;
    
    // Log detallado para diagnóstico
    console.log('🔍 [VoiceSearchButton] Verificando módulos nativos...');
    console.log('📦 NativeModules.RCTVoice:', NativeModules.RCTVoice ? '✅ Disponible' : '❌ NULL');
    console.log('📦 NativeModules.Voice:', NativeModules.Voice ? '✅ Disponible' : '❌ NULL');
    console.log('📦 Todos los módulos nativos:', Object.keys(NativeModules).filter(k => 
      k.toLowerCase().includes('voice') || k.toLowerCase().includes('rct')
    ));
    
    if (!VoiceNativeModule) {
      console.error('❌ NativeModules.RCTVoice/Voice is null - El módulo nativo no está vinculado');
      console.error('📋 Todos los módulos disponibles:', Object.keys(NativeModules).sort().join(', '));
      console.warn('⚠️ El módulo Voice no está disponible. Esto se solucionará al reconstruir la app.');
      // No retornar aquí, permitir que el componente se monte
      // El error se mostrará cuando el usuario intente usar el micrófono
    } else {
      console.log('✅ Módulo nativo de voz está disponible (RCTVoice o Voice)');
      console.log('📋 Métodos del módulo:', Object.keys(VoiceNativeModule));
    }

    // Verificar que Voice esté disponible
    if (!Voice) {
      console.error('❌ Voice module is not available - Voice is null or undefined');
      Alert.alert('Error', 'El módulo de reconocimiento de voz no está disponible. Por favor, reinstala la aplicación.');
      return;
    }

    console.log('✅ Voice module está disponible:', {
      nativeModule: VoiceNativeModule ? '✅' : '❌',
      hasStart: typeof Voice.start === 'function',
      hasStop: typeof Voice.stop === 'function',
      hasIsAvailable: typeof Voice.isAvailable === 'function',
      hasOnSpeechStart: typeof Voice.onSpeechStart !== 'undefined',
    });

    // Verificar disponibilidad del módulo
    const checkVoiceAvailability = async () => {
      try {
        // Intentar verificar si el módulo está disponible
        if (typeof Voice.isAvailable === 'function') {
          const available: any = await Voice.isAvailable();
          console.log('🔍 Voice.isAvailable() retornó:', available);
          // Verificar si está disponible (puede ser boolean, número, objeto, etc.)
          const isAvailable = available !== false && available !== null && available !== 0 && 
                             (typeof available !== 'object' || (available && available.isSpeechAvailable !== false));
          setVoiceAvailable(isAvailable);
          console.log('📊 Voice disponible:', isAvailable);
        } else {
          // Si no hay función isAvailable, asumir que está disponible
          console.log('⚠️ Voice.isAvailable no es una función, asumiendo que está disponible');
          setVoiceAvailable(true);
        }
      } catch (error) {
        console.warn('⚠️ No se pudo verificar disponibilidad de Voice:', error);
        // Intentar de todas formas
        setVoiceAvailable(true);
      }
    };

    checkVoiceAvailability();

    // Configurar listeners de Voice solo si está disponible
    // Los setters siempre están disponibles en la instancia de RCTVoice,
    // pero solo funcionarán si el módulo nativo está vinculado
    try {
    Voice.onSpeechStart = onSpeechStart;
    Voice.onSpeechEnd = onSpeechEnd;
    Voice.onSpeechResults = onSpeechResults;
    Voice.onSpeechPartialResults = onSpeechPartialResults;
    Voice.onSpeechError = onSpeechError;
      console.log('✅ Listeners de Voice configurados correctamente');
    } catch (error) {
      console.error('❌ Error configurando listeners de Voice:', error);
    }

    return () => {
      // Limpiar listeners
      if (Voice && typeof Voice.destroy === 'function') {
        Voice.destroy().then(() => {
          if (Voice && typeof Voice.removeAllListeners === 'function') {
            Voice.removeAllListeners();
          }
          console.log('✅ Voice listeners limpiados');
        }).catch((err: any) => {
          console.warn('⚠️ Error al limpiar Voice:', err);
        });
      }
    };
  }, []);

  useEffect(() => {
    if (isListening) {
      // Animación de pulso mientras escucha
      Animated.loop(
        Animated.sequence([
          Animated.timing(scaleAnim, {
            toValue: 1.2,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(scaleAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      scaleAnim.setValue(1);
    }
  }, [isListening]);

  const onSpeechStart = () => {
    console.log('🎤 Escuchando...');
    setIsListening(true);
  };

  const onSpeechEnd = () => {
    console.log('🎤 Fin de grabación');
    setIsListening(false);
  };

  const onSpeechResults = (event: SpeechResultsEvent) => {
    console.log('🎤 Resultados finales:', event.value);
    if (event.value && event.value.length > 0) {
      const text = event.value[0];
      setPartialResults('');
      onCommandReceived(text);
    }
  };

  const onSpeechPartialResults = (event: SpeechResultsEvent) => {
    console.log('🎤 Resultados parciales:', event.value);
    if (event.value && event.value.length > 0) {
      setPartialResults(event.value[0]);
    }
  };

  const onSpeechError = (event: SpeechErrorEvent) => {
    console.error('🎤 Error de voz:', event.error);
    setIsListening(false);
    setPartialResults('');
    
    // Error 7 es "No match" - no mostrar alerta para este caso
    // Error 6 es "RecognitionService busy" - no mostrar alerta
    const errorCode = event.error?.code;
    const errorCodeNum = typeof errorCode === 'string' ? parseInt(errorCode, 10) : errorCode;
    if (errorCodeNum !== 7 && errorCodeNum !== 6 && event.error?.message) {
      const errorMessage = event.error.message.includes('permission') 
        ? 'Se necesita permiso de micrófono'
        : 'No se pudo reconocer la voz. Intenta nuevamente.';
      Alert.alert('Error', errorMessage);
    }
  };

  const requestMicrophonePermission = async (): Promise<boolean> => {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Permiso de Micrófono',
            message: 'La app necesita acceso al micrófono para búsqueda por voz',
            buttonPositive: 'Permitir',
            buttonNegative: 'Cancelar',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn(err);
        return false;
      }
    }
    return true;
  };

  const startListening = async () => {
    if (disabled) return;

    // Verificar que el módulo nativo esté disponible PRIMERO
    // El módulo se registra como "RCTVoice" en NativeModules
    const VoiceNativeModule = NativeModules.RCTVoice || NativeModules.Voice;
    if (!VoiceNativeModule) {
      console.error('❌ NativeModules.RCTVoice/Voice es null');
      
      // Ejecutar diagnóstico completo
      console.log('🔍 Ejecutando diagnóstico completo del módulo Voice...');
      const diagnostics = await diagnoseVoiceModule();
      printDiagnostics(diagnostics);
      
      Alert.alert(
        'Error - Módulo nativo no vinculado',
        'El módulo nativo de reconocimiento de voz no está disponible.\n\n' +
        'Esto significa que el módulo no se vinculó durante la compilación.\n\n' +
        'SOLUCIÓN:\n' +
        '1. Ejecuta: ./complete_fix_voice.sh\n' +
        '2. O manualmente:\n' +
        '   rm -rf node_modules\n' +
        '   npm install\n' +
        '   cd android && ./gradlew clean && cd ..\n' +
        '   npx react-native run-android\n\n' +
        'Revisa la consola para el diagnóstico completo.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Verificar que Voice esté disponible
    if (!Voice) {
      console.error('❌ Voice module is null');
      Alert.alert('Error', 'El módulo de reconocimiento de voz no está disponible.');
      return;
    }

    try {
      const hasPermission = await requestMicrophonePermission();
      if (!hasPermission) {
        Alert.alert('Permiso Denegado', 'Se necesita permiso de micrófono para usar búsqueda por voz');
        return;
      }

      // Verificar que Voice.start esté disponible
      if (typeof Voice.start !== 'function') {
        Alert.alert('Error', 'La función de reconocimiento de voz no está disponible en este dispositivo');
        return;
      }

      setPartialResults('');
      
      // Detener cualquier reconocimiento previo antes de iniciar uno nuevo
      try {
        if (isListening) {
          await Voice.stop();
        }
      } catch (stopError) {
        console.warn('Error al detener reconocimiento previo:', stopError);
      }
      
      // Intentar con diferentes idiomas y configuraciones
      let lastError: any = null;
      const languages = ['es-ES', 'es-MX', 'es-US', 'es'];
      
      for (const lang of languages) {
        try {
          console.log(`🎤 Intentando iniciar reconocimiento con idioma: ${lang}`);
          await Voice.start(lang);
          console.log(`✅ Reconocimiento iniciado exitosamente con ${lang}`);
          return; // Si tiene éxito, salir de la función
        } catch (error: any) {
          console.warn(`❌ Error con idioma ${lang}:`, error?.message || error);
          lastError = error;
          // Continuar con el siguiente idioma
        }
      }
      
      // Si todos los idiomas fallan, intentar con 'en-US' como último recurso
      try {
        console.log('🎤 Intentando iniciar reconocimiento con en-US como último recurso...');
        await Voice.start('en-US');
        console.log('✅ Reconocimiento iniciado exitosamente con en-US');
        return;
      } catch (defaultError: any) {
        console.error('❌ Error con en-US:', defaultError?.message || defaultError);
        lastError = defaultError;
      }
      
      // Si llegamos aquí, todos los intentos fallaron - ejecutar diagnóstico
      console.log('❌ Todos los intentos de iniciar reconocimiento fallaron. Ejecutando diagnóstico...');
      const diagnostics = await diagnoseVoiceModule();
      printDiagnostics(diagnostics);
      
      // Construir mensaje de error con recomendaciones
      const errorMessage = lastError?.message || lastError?.toString() || 'Error desconocido';
      const recommendations = diagnostics.recommendations.slice(0, 3).join('\n');
      
      throw new Error(`No se pudo iniciar el reconocimiento de voz.\n\nError: ${errorMessage}\n\nRecomendaciones:\n${recommendations}\n\nRevisa la consola para el diagnóstico completo.`);
    } catch (error: any) {
      console.error('Error al iniciar voz:', error);
      const errorMessage = error?.message || 'No se pudo iniciar el reconocimiento de voz. Verifica que el micrófono esté funcionando.';
      Alert.alert('Error', errorMessage);
      setIsListening(false);
    }
  };

  const stopListening = async () => {
    if (!Voice || typeof Voice.stop !== 'function') {
      setIsListening(false);
      return;
    }
    
    try {
      await Voice.stop();
      setIsListening(false);
    } catch (error) {
      console.error('Error al detener voz:', error);
      setIsListening(false);
    }
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[
          styles.button,
          disabled && styles.buttonDisabled,
        ]}
        onPress={isListening ? stopListening : startListening}
        onLongPress={async () => {
          // Long press para ejecutar diagnóstico
          console.log('🔍 Ejecutando diagnóstico (long press)...');
          const diagnostics = await diagnoseVoiceModule();
          printDiagnostics(diagnostics);
          Alert.alert(
            'Diagnóstico de Voice',
            `Módulo: ${diagnostics.moduleAvailable ? '✅' : '❌'}\n` +
            `Permiso: ${diagnostics.permissionGranted ? '✅' : '❌'}\n` +
            `Soporte: ${diagnostics.deviceSupport.hasSpeechRecognizer ? '✅' : '❌'}\n\n` +
            `Revisa la consola para detalles completos.`,
            [{ text: 'OK' }]
          );
        }}
        activeOpacity={0.8}
        disabled={disabled}
      >
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <Text style={styles.iconEmoji}>{isListening ? '🎤' : '🎤'}</Text>
        </Animated.View>
      </TouchableOpacity>

      {partialResults !== '' && (
        <View style={styles.partialResultsContainer}>
          <Text style={styles.partialResultsText}>
            "{partialResults}"
          </Text>
        </View>
      )}

      {isListening && (
        <Text style={styles.listeningText}>Escuchando...</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  button: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  buttonDisabled: {
    backgroundColor: '#CCCCCC',
    opacity: 0.5,
  },
  iconEmoji: {
    fontSize: 28,
  },
  listeningText: {
    marginTop: 8,
    fontSize: 12,
    color: colors.primary,
    fontWeight: 'bold',
  },
  partialResultsContainer: {
    marginTop: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F0F0F0',
    borderRadius: 8,
    maxWidth: 280,
  },
  partialResultsText: {
    fontSize: 14,
    color: '#333',
    fontStyle: 'italic',
    textAlign: 'center',
  },
});