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
  
    // 1. Detectar "mañana"
    if (lowerText.includes('manana') || lowerText.includes('mañana')) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return {
        action: 'filter_by_date',
        params: { date: tomorrow, dateRange: 'tomorrow' },
        originalText: text,
      };
    }
  
    // 2. Detectar "hoy"
    if (lowerText.includes('hoy')) {
      return {
        action: 'filter_by_date',
        params: { date: new Date(), dateRange: 'today' },
        originalText: text,
      };
    }
  
    // 3. Detectar "próxima fecha" o "siguiente fecha"
    if (lowerText.includes('proxima fecha') || 
        lowerText.includes('siguiente fecha') ||
        lowerText.includes('proxima jornada')) {
      return {
        action: 'filter_by_date',
        params: { dateRange: 'next' },
        originalText: text,
      };
    }
  
    // 4. Detectar "última fecha" o "fecha anterior"
    if (lowerText.includes('ultima fecha') || 
        lowerText.includes('fecha anterior') ||
        lowerText.includes('ultima jornada')) {
      return {
        action: 'filter_by_date',
        params: { dateRange: 'previous' },
        originalText: text,
      };
    }
  
    // 5. Detectar "últimos X partidos de [equipo]"
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
  
    // 6. Detectar "partidos de [equipo]"
    const teamRegex = /partidos?\s+de\s+(.+)/i;
    const teamMatch = lowerText.match(teamRegex);
    if (teamMatch) {
      const teamName = teamMatch[1].trim();
      return {
        action: 'filter_by_team',
        params: { teamName },
        originalText: text,
      };
    }
  
    // 7. Detectar "mostrar todos" o "todos los partidos"
    if (lowerText.includes('todos') || 
        lowerText.includes('mostrar todo') ||
        lowerText.includes('ver todo')) {
      return {
        action: 'show_all',
        params: {},
        originalText: text,
      };
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