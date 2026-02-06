// Procesa comandos de voz y extrae intenciones
export interface VoiceCommand {
    action: 'filter_by_date' | 'filter_by_team' | 'filter_recent' | 'show_all' | 'unknown';
    params: {
      date?: Date;
      teamName?: string;
      count?: number;
      dateRange?: 'today' | 'tomorrow' | 'next' | 'previous';
    };
    originalText: string;
  }
  
  export const processVoiceCommand = (text: string): VoiceCommand => {
    const lowerText = text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    console.log('🎤 Procesando comando:', lowerText);
  
    // 1. Detectar "mañana" y variaciones
    if (lowerText.includes('manana') || lowerText.includes('mañana') || 
        lowerText.includes('pasado manana') || lowerText.includes('pasado mañana') ||
        lowerText.includes('el manana') || lowerText.includes('el mañana')) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return {
        action: 'filter_by_date',
        params: { date: tomorrow, dateRange: 'tomorrow' },
        originalText: text,
      };
    }
  
    // 2. Detectar "hoy" y variaciones
    if (lowerText.includes('hoy') || lowerText.includes('este dia') || 
        lowerText.includes('este día') || lowerText.includes('el dia de hoy') ||
        lowerText.includes('el día de hoy') || lowerText.includes('partidos de hoy') ||
        lowerText.includes('juegos de hoy') || lowerText.includes('encuentros de hoy')) {
      return {
        action: 'filter_by_date',
        params: { date: new Date(), dateRange: 'today' },
        originalText: text,
      };
    }
  
    // 3. Detectar "próxima fecha" o "siguiente fecha" y variaciones
    if (lowerText.includes('proxima fecha') || lowerText.includes('próxima fecha') ||
        lowerText.includes('siguiente fecha') || lowerText.includes('proxima jornada') ||
        lowerText.includes('próxima jornada') || lowerText.includes('siguiente jornada') ||
        lowerText.includes('proximo partido') || lowerText.includes('próximo partido') ||
        lowerText.includes('siguiente partido') || lowerText.includes('proximos partidos') ||
        lowerText.includes('próximos partidos') || lowerText.includes('siguientes partidos') ||
        lowerText.includes('proximo encuentro') || lowerText.includes('próximo encuentro')) {
      return {
        action: 'filter_by_date',
        params: { dateRange: 'next' },
        originalText: text,
      };
    }
  
    // 4. Detectar "última fecha" o "fecha anterior" y variaciones
    if (lowerText.includes('ultima fecha') || lowerText.includes('última fecha') ||
        lowerText.includes('fecha anterior') || lowerText.includes('ultima jornada') ||
        lowerText.includes('última jornada') || lowerText.includes('jornada anterior') ||
        lowerText.includes('ultimo partido') || lowerText.includes('último partido') ||
        lowerText.includes('partido anterior') || lowerText.includes('ultimos partidos') ||
        lowerText.includes('últimos partidos') || lowerText.includes('partidos anteriores') ||
        lowerText.includes('ultimo encuentro') || lowerText.includes('último encuentro')) {
      return {
        action: 'filter_by_date',
        params: { dateRange: 'previous' },
        originalText: text,
      };
    }
  
    // 5. Detectar "últimos X partidos de [equipo]" y variaciones
    const lastMatchesRegex = /ultimos?\s+(\d+)\s+partidos?\s+de\s+(.+)/i;
    const lastMatchesMatch = lowerText.match(lastMatchesRegex);
    if (lastMatchesMatch) {
      const count = parseInt(lastMatchesMatch[1]);
      const teamName = lastMatchesMatch[2].trim();
      return {
        action: 'filter_recent',
        params: { teamName, count },
        originalText: text,
      };
    }
  
    // 6. Detectar "partidos de [equipo]" y variaciones
    const teamRegex = /(?:partidos?|juegos?|encuentros?|equipo)\s+(?:de|del|de la|del equipo)\s+(.+)/i;
    const teamMatch = lowerText.match(teamRegex);
    if (teamMatch) {
      const teamName = teamMatch[1].trim();
      // Limpiar palabras comunes al final
      const cleanedName = teamName.replace(/\s+(partidos?|juegos?|encuentros?)$/i, '').trim();
      return {
        action: 'filter_by_team',
        params: { teamName: cleanedName },
        originalText: text,
      };
    }
    
    // 6b. Detectar solo nombre de equipo (sin "partidos de")
    // Buscar palabras que puedan ser nombres de equipos (más de 2 caracteres)
    const words = lowerText.split(/\s+/).filter(w => w.length > 2);
    if (words.length > 0) {
      // Si no coincide con ninguna palabra clave, podría ser un nombre de equipo
      const keywords = ['hoy', 'manana', 'mañana', 'proxima', 'próxima', 'siguiente', 
                       'ultima', 'última', 'anterior', 'todos', 'todo', 'mostrar', 'ver',
                       'partidos', 'juegos', 'encuentros', 'equipo', 'equipos'];
      const isKeyword = words.some(w => keywords.some(k => w.includes(k) || k.includes(w)));
      if (!isKeyword && words.length <= 3) {
        // Podría ser un nombre de equipo
        const possibleTeamName = words.join(' ');
        return {
          action: 'filter_by_team',
          params: { teamName: possibleTeamName },
          originalText: text,
        };
      }
    }
  
    // 7. Detectar "mostrar todos" o "todos los partidos" y variaciones
    if (lowerText.includes('todos') || lowerText.includes('todo') ||
        lowerText.includes('mostrar todo') || lowerText.includes('ver todo') ||
        lowerText.includes('todos los partidos') || lowerText.includes('todos los juegos') ||
        lowerText.includes('todos los encuentros') || lowerText.includes('mostrar todos') ||
        lowerText.includes('ver todos') || lowerText.includes('sin filtro') ||
        lowerText.includes('quitar filtro') || lowerText.includes('limpiar filtro') ||
        lowerText.includes('resetear') || lowerText.includes('reiniciar')) {
      return {
        action: 'show_all',
        params: {},
        originalText: text,
      };
    }
    
    // 8. Detectar "en vivo" o "partidos en vivo"
    if (lowerText.includes('en vivo') || lowerText.includes('partidos en vivo') ||
        lowerText.includes('juegos en vivo') || lowerText.includes('encuentros en vivo') ||
        lowerText.includes('ahora') || lowerText.includes('jugando ahora') ||
        lowerText.includes('en este momento')) {
      return {
        action: 'filter_by_date',
        params: { dateRange: 'today' },
        originalText: text,
      };
    }
    
    // 9. Detectar "finalizados" o "partidos finalizados"
    if (lowerText.includes('finalizados') || lowerText.includes('terminados') ||
        lowerText.includes('partidos finalizados') || lowerText.includes('juegos finalizados') ||
        lowerText.includes('ya jugados') || lowerText.includes('completados')) {
      return {
        action: 'filter_by_date',
        params: { dateRange: 'previous' },
        originalText: text,
      };
    }
    
    // 10. Detectar días de la semana
    const daysOfWeek: { [key: string]: number } = {
      'lunes': 1, 'martes': 2, 'miercoles': 3, 'miércoles': 3, 'jueves': 4,
      'viernes': 5, 'sabado': 6, 'sábado': 6, 'domingo': 0
    };
    
    for (const [dayName, dayOffset] of Object.entries(daysOfWeek)) {
      if (lowerText.includes(dayName)) {
        const today = new Date();
        const dayOfWeek = today.getDay();
        let daysToAdd = dayOffset - dayOfWeek;
        if (daysToAdd < 0) daysToAdd += 7; // Si ya pasó, buscar el próximo
        const targetDate = new Date(today);
        targetDate.setDate(today.getDate() + daysToAdd);
        return {
          action: 'filter_by_date',
          params: { date: targetDate, dateRange: 'today' },
          originalText: text,
        };
      }
    }
  
    // Si no se detecta ningún patrón conocido
    return {
      action: 'unknown',
      params: {},
      originalText: text,
    };
  };
  
  // Función auxiliar para comparar fechas (solo día/mes/año)
  export const isSameDay = (date1: Date, date2: Date): boolean => {
    return (
      date1.getFullYear() === date2.getFullYear() &&
      date1.getMonth() === date2.getMonth() &&
      date1.getDate() === date2.getDate()
    );
  };
  
  // Función para buscar equipo por nombre (case-insensitive, con similitud)
  export const findTeamByName = (searchName: string, teams: string[]): string | null => {
    const normalizedSearch = searchName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    // Búsqueda exacta
    for (const team of teams) {
      const normalizedTeam = team.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (normalizedTeam.includes(normalizedSearch) || normalizedSearch.includes(normalizedTeam)) {
        return team;
      }
    }
    
    return null;
  };