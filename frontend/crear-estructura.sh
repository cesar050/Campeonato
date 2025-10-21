#!/bin/bash

echo "🚀 Creando estructura completa del frontend..."

# Crear carpetas
mkdir -p src/app/models

# Servicios
echo "📦 Creando servicios..."
ng generate service services/auth --skip-tests
ng generate service services/api --skip-tests
ng generate service services/usuario --skip-tests
ng generate service services/equipo --skip-tests
ng generate service services/jugador --skip-tests
ng generate service services/campeonato --skip-tests
ng generate service services/partido --skip-tests
ng generate service services/gol --skip-tests
ng generate service services/tarjeta --skip-tests
ng generate service services/alineacion --skip-tests
ng generate service services/solicitud --skip-tests
ng generate service services/notificacion --skip-tests

# Guards e Interceptors
echo "🔒 Creando guards e interceptors..."
ng generate guard guards/auth --skip-tests
ng generate guard guards/role --skip-tests
ng generate interceptor interceptors/auth --skip-tests

# Componentes - Autenticación
echo "🔐 Creando componentes de autenticación..."
ng generate component components/auth/login --skip-tests
ng generate component components/auth/register --skip-tests

# Dashboard
echo "📊 Creando dashboard..."
ng generate component components/dashboard --skip-tests

# Usuarios
echo "👥 Creando componentes de usuarios..."
ng generate component components/usuarios --skip-tests

# Equipos
echo "⚽ Creando componentes de equipos..."
ng generate component components/equipos/lista-equipos --skip-tests
ng generate component components/equipos/form-equipo --skip-tests
ng generate component components/equipos/detalle-equipo --skip-tests
ng generate component components/solicitudes-equipo --skip-tests

# Jugadores
echo "🏃 Creando componentes de jugadores..."
ng generate component components/jugadores/lista-jugadores --skip-tests
ng generate component components/jugadores/form-jugador --skip-tests

# Campeonatos
echo "🏆 Creando componentes de campeonatos..."
ng generate component components/campeonatos/lista-campeonatos --skip-tests
ng generate component components/campeonatos/form-campeonato --skip-tests
ng generate component components/campeonatos/detalle-campeonato --skip-tests

# Partidos
echo "📅 Creando componentes de partidos..."
ng generate component components/partidos/lista-partidos --skip-tests
ng generate component components/partidos/form-partido --skip-tests
ng generate component components/partidos/detalle-partido --skip-tests

# Gestión de partido
echo "⚡ Creando componentes de gestión de partido..."
ng generate component components/alineaciones --skip-tests
ng generate component components/goles --skip-tests
ng generate component components/tarjetas --skip-tests

# Visualización
echo "📈 Creando componentes de visualización..."
ng generate component components/tabla-posiciones --skip-tests
ng generate component components/goleadores --skip-tests
ng generate component components/notificaciones --skip-tests

# Componentes compartidos
echo "🔧 Creando componentes compartidos..."
ng generate component shared/navbar --skip-tests
ng generate component shared/sidebar --skip-tests
ng generate component shared/footer --skip-tests
ng generate component shared/loading --skip-tests
ng generate component shared/alert --skip-tests

echo "✅ ¡Estructura completa creada exitosamente!"
echo "📁 Revisa tu carpeta src/app/"
