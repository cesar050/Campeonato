// Utilidad para diagnosticar problemas con el módulo de reconocimiento de voz
import { Platform, PermissionsAndroid, NativeModules } from 'react-native';
import Voice from '@react-native-community/voice';

export interface VoiceDiagnostics {
  moduleAvailable: boolean;
  functionsAvailable: {
    start: boolean;
    stop: boolean;
    isAvailable: boolean;
    destroy: boolean;
    removeAllListeners: boolean;
  };
  permissionGranted: boolean;
  deviceSupport: {
    hasSpeechRecognizer: boolean;
    error?: string;
  };
  recommendations: string[];
}

export const diagnoseVoiceModule = async (): Promise<VoiceDiagnostics> => {
  const diagnostics: VoiceDiagnostics = {
    moduleAvailable: false,
    functionsAvailable: {
      start: false,
      stop: false,
      isAvailable: false,
      destroy: false,
      removeAllListeners: false,
    },
    permissionGranted: false,
    deviceSupport: {
      hasSpeechRecognizer: false,
    },
    recommendations: [],
  };

  // 1. Verificar si el módulo nativo está disponible
  console.log('🔍 [DIAGNÓSTICO] Verificando módulo nativo...');
  const VoiceNativeModule = NativeModules.RCTVoice || NativeModules.Voice;
  if (!VoiceNativeModule) {
    diagnostics.recommendations.push('❌ CRÍTICO: NativeModules.RCTVoice/Voice es null. El módulo nativo NO está vinculado.');
    diagnostics.recommendations.push('   Solución: Ejecuta ./complete_fix_voice.sh o reconstruye completamente la app.');
    diagnostics.recommendations.push(`   Módulos disponibles: ${Object.keys(NativeModules).filter(k => k.toLowerCase().includes('voice') || k.toLowerCase().includes('rct')).join(', ') || 'ninguno'}`);
    // Continuar con el diagnóstico aunque el módulo nativo no esté disponible
  } else {
    console.log('✅ [DIAGNÓSTICO] Módulo nativo RCTVoice/Voice está disponible');
    diagnostics.moduleAvailable = true;
  }

  // 2. Verificar el wrapper de JavaScript
  console.log('🔍 [DIAGNÓSTICO] Verificando wrapper JavaScript Voice...');
  if (!Voice) {
    diagnostics.recommendations.push('❌ El módulo Voice (wrapper JS) es null/undefined. Reinstala el módulo: npm uninstall @react-native-community/voice && npm install @react-native-community/voice');
    return diagnostics;
  }
  console.log('✅ [DIAGNÓSTICO] Módulo Voice (wrapper JS) está disponible');

  // 2. Verificar funciones disponibles
  console.log('🔍 [DIAGNÓSTICO] Verificando funciones disponibles...');
  diagnostics.functionsAvailable = {
    start: typeof Voice.start === 'function',
    stop: typeof Voice.stop === 'function',
    isAvailable: typeof Voice.isAvailable === 'function',
    destroy: typeof Voice.destroy === 'function',
    removeAllListeners: typeof Voice.removeAllListeners === 'function',
  };

  const missingFunctions = Object.entries(diagnostics.functionsAvailable)
    .filter(([_, available]) => !available)
    .map(([name]) => name);

  if (missingFunctions.length > 0) {
    diagnostics.recommendations.push(`❌ Faltan funciones: ${missingFunctions.join(', ')}. El módulo nativo no está vinculado correctamente.`);
  } else {
    console.log('✅ [DIAGNÓSTICO] Todas las funciones están disponibles');
  }

  // 3. Verificar permisos
  console.log('🔍 [DIAGNÓSTICO] Verificando permisos...');
  if (Platform.OS === 'android') {
    try {
      const checkResult = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
      diagnostics.permissionGranted = checkResult;
      
      if (!checkResult) {
        diagnostics.recommendations.push('❌ Permiso de micrófono NO concedido. Ve a Configuración > Apps > CampeonatoMovil > Permisos y habilita el micrófono.');
      } else {
        console.log('✅ [DIAGNÓSTICO] Permiso de micrófono concedido');
      }
    } catch (error: any) {
      diagnostics.recommendations.push(`❌ Error verificando permisos: ${error.message}`);
    }
  } else {
    diagnostics.permissionGranted = true; // iOS maneja permisos diferente
  }

  // 4. Verificar soporte del dispositivo
  console.log('🔍 [DIAGNÓSTICO] Verificando soporte del dispositivo...');
  if (diagnostics.functionsAvailable.isAvailable) {
    try {
      const availability: any = await Voice.isAvailable();
      console.log('📊 [DIAGNÓSTICO] Voice.isAvailable() retornó:', availability);
      
      // Manejar el caso cuando availability es null (módulo nativo no vinculado)
      if (availability === null) {
        diagnostics.deviceSupport.hasSpeechRecognizer = false;
        diagnostics.deviceSupport.error = 'Módulo nativo no vinculado (availability es null)';
        diagnostics.recommendations.push('❌ CRÍTICO: El módulo nativo no está vinculado. Ejecuta: ./fix_voice_module.sh o reinstala completamente la app.');
        diagnostics.recommendations.push('   Pasos: 1) rm -rf node_modules && npm install 2) cd android && ./gradlew clean && cd .. 3) npx react-native run-android');
      } else if (availability === false || availability === 0) {
        diagnostics.deviceSupport.hasSpeechRecognizer = false;
        diagnostics.deviceSupport.error = 'El dispositivo no soporta reconocimiento de voz';
        diagnostics.recommendations.push('❌ Tu dispositivo no soporta reconocimiento de voz. Verifica que Google App esté instalada y actualizada.');
      } else if (typeof availability === 'object' && availability !== null) {
        // Verificar si tiene la propiedad isSpeechAvailable
        if (availability.isSpeechAvailable === null || availability.isSpeechAvailable === undefined) {
          diagnostics.deviceSupport.hasSpeechRecognizer = false;
          diagnostics.deviceSupport.error = 'isSpeechAvailable es null/undefined - módulo nativo no vinculado';
          diagnostics.recommendations.push('❌ CRÍTICO: Módulo nativo no vinculado. Reconstruye la app completamente.');
        } else {
          diagnostics.deviceSupport.hasSpeechRecognizer = availability.isSpeechAvailable === true;
          if (!diagnostics.deviceSupport.hasSpeechRecognizer) {
            diagnostics.deviceSupport.error = 'isSpeechAvailable es false';
            diagnostics.recommendations.push('❌ El reconocimiento de voz no está disponible. Instala o actualiza Google App desde Play Store.');
          }
        }
      } else {
        diagnostics.deviceSupport.hasSpeechRecognizer = true;
      }
    } catch (error: any) {
      diagnostics.deviceSupport.error = error.message || 'Error desconocido';
      if (error.message && error.message.includes('null')) {
        diagnostics.recommendations.push('❌ CRÍTICO: Error de módulo nativo no vinculado. Reconstruye la app: ./fix_voice_module.sh');
      } else {
        diagnostics.recommendations.push(`❌ Error verificando disponibilidad: ${error.message}`);
      }
    }
  } else {
    diagnostics.recommendations.push('⚠️ No se puede verificar soporte del dispositivo (isAvailable no está disponible)');
  }

  // 5. Intentar iniciar reconocimiento (prueba final)
  if (diagnostics.moduleAvailable && diagnostics.functionsAvailable.start && diagnostics.permissionGranted) {
    console.log('🔍 [DIAGNÓSTICO] Intentando iniciar reconocimiento (prueba)...');
    try {
      await Voice.start('es-ES');
      console.log('✅ [DIAGNÓSTICO] Reconocimiento iniciado exitosamente');
      await Voice.stop();
      console.log('✅ [DIAGNÓSTICO] Reconocimiento detenido exitosamente');
      diagnostics.recommendations.push('✅ El módulo funciona correctamente');
    } catch (error: any) {
      console.error('❌ [DIAGNÓSTICO] Error al iniciar reconocimiento:', error);
      diagnostics.deviceSupport.error = error.message || 'Error al iniciar reconocimiento';
      diagnostics.recommendations.push(`❌ Error al iniciar reconocimiento: ${error.message}. Verifica los logs de Android.`);
    }
  }

  return diagnostics;
};

export const printDiagnostics = (diagnostics: VoiceDiagnostics) => {
  console.log('\n📋 ========== DIAGNÓSTICO DE VOICE MODULE ==========');
  console.log(`Módulo disponible: ${diagnostics.moduleAvailable ? '✅' : '❌'}`);
  console.log(`Permiso concedido: ${diagnostics.permissionGranted ? '✅' : '❌'}`);
  console.log(`Soporte del dispositivo: ${diagnostics.deviceSupport.hasSpeechRecognizer ? '✅' : '❌'}`);
  if (diagnostics.deviceSupport.error) {
    console.log(`Error del dispositivo: ${diagnostics.deviceSupport.error}`);
  }
  console.log('\nFunciones disponibles:');
  Object.entries(diagnostics.functionsAvailable).forEach(([name, available]) => {
    console.log(`  ${name}: ${available ? '✅' : '❌'}`);
  });
  console.log('\nRecomendaciones:');
  diagnostics.recommendations.forEach((rec, index) => {
    console.log(`  ${index + 1}. ${rec}`);
  });
  console.log('================================================\n');
};
