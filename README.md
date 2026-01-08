# Campeonato Libre

Sistema integral de gestión de campeonatos deportivos de fútbol e indoor. Permite administrar equipos, jugadores, partidos, alineaciones y estadísticas en tiempo real.

## Características Principales

- Gestión completa de campeonatos (creación, inscripciones, seguimiento)
- Administración de equipos y jugadores con validación de documentos
- Sistema de alineaciones con posicionamiento visual (drag & drop)
- Registro de eventos de partidos en tiempo real (goles, tarjetas, cambios)
- Generación automática de fixtures (liga, eliminación, mixto)
- Sistema de notificaciones
- Estadísticas y tablas de posiciones automáticas
- Múltiples roles de usuario con permisos diferenciados

## Tecnologías

### Backend
- Python 3.11
- Flask 3.0
- MySQL 8.0
- SQLAlchemy
- JWT para autenticación
- Flask-RESTX para documentación API

### Frontend
- Angular 21
- TypeScript 5.9
- Angular Material 21
- RxJS 7.8
- Angular CDK (Drag & Drop)

## Arquitectura

El sistema implementa una arquitectura de microservicios con:
- Backend principal (Flask) - Puerto 5000
- Microservicio de alineaciones (Flask) - Puerto 5001
- Frontend (Angular SPA) - Puerto 4200
- Base de datos principal (MySQL)
- Base de datos de alineaciones (MySQL)

## Requisitos Previos

- Python 3.11 o superior
- Node.js 18.x o superior
- MySQL 8.0
- Git

## Instalación

### Backend Principal
```bash
cd backend
python -m venv venv
source venv/bin/activate  # En Windows: venv\Scripts\activate
pip install -r requirements.txt

# Configurar base de datos en .env
cp .env.example .env
# Editar .env con tus credenciales de MySQL

# Ejecutar migraciones
flask db upgrade

# Iniciar servidor
python run.py
```

### Microservicio de Alineaciones
```bash
cd microservicio-alineaciones
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Configurar .env
cp .env.example .env

# Ejecutar migraciones
flask db upgrade

# Iniciar servidor
python run.py
```

### Frontend
```bash
cd frontend
npm install

# Configurar URL del backend en src/environments/environment.ts

# Iniciar servidor de desarrollo
ng serve
```

## Acceso a la Aplicación

- Frontend: http://localhost:4200
- Backend API: http://localhost:5000
- Microservicio Alineaciones: http://localhost:5001
- Documentación API: http://localhost:5000/api/docs

## Usuarios de Prueba

### Superadmin
- Email: superadmin@gmail.com
- Password: Super123456

### Organizador
- Email: organizador@gmail.com
- Password: Org123456

### Líder de Equipo
- Email: lider@gmail.com
- Password: Lider123456

## Roles y Permisos

### Superadmin
- Gestión completa del sistema
- Crear y administrar organizadores
- Ver estadísticas globales
- Administrar todos los usuarios

### Organizador (Admin)
- Crear y gestionar campeonatos
- Aprobar/rechazar solicitudes de equipos
- Generar fixtures automáticamente
- Registrar eventos de partidos
- Ver alineaciones y estadísticas

### Líder de Equipo
- Gestionar equipos y jugadores
- Inscribir equipos a campeonatos
- Definir alineaciones con drag & drop
- Realizar cambios durante partidos
- Ver estadísticas del equipo

### Espectador
- Consultar campeonatos públicos
- Ver resultados y estadísticas
- Consultar tablas de posiciones

## Estructura del Proyecto
```
Campeonato/
├── backend/                      # Backend principal Flask
│   ├── app/
│   │   ├── models/              # Modelos SQLAlchemy
│   │   ├── routes/              # Endpoints API
│   │   ├── security/            # Autenticación y seguridad
│   │   └── utils/               # Utilidades
│   ├── migrations/              # Migraciones de BD
│   └── run.py
│
├── microservicio-alineaciones/  # Microservicio de alineaciones
│   ├── app/
│   │   ├── models/
│   │   ├── routes/
│   │   └── services/
│   └── run.py
│
├── frontend/                    # Frontend Angular
│   ├── src/
│   │   ├── app/
│   │   │   ├── core/           # Servicios singleton
│   │   │   ├── features/       # Módulos por funcionalidad
│   │   │   └── shared/         # Componentes compartidos
│   │   └── environments/
│   └── angular.json
│
└── docs/                        # Documentación
    ├── architecture/            # Diagramas C4
    └── Manual_Frontend.pdf
```

## Funcionalidades Destacadas

### Sistema de Alineaciones
Sistema innovador que permite a los líderes de equipo:
- Arrastrar jugadores visualmente a posiciones en la cancha
- Seleccionar entre múltiples formaciones tácticas (4-4-2, 4-3-3, etc.)
- Validación automática de mínimos (7 titulares, 3 suplentes)
- Realizar cambios durante partidos

### Generación de Fixtures
Algoritmos automáticos para generar calendarios según tipo de competición:
- Liga (Round Robin): Todos contra todos
- Eliminación directa: Cuadro de playoffs
- Mixto: Fase de grupos + eliminación

### Registro de Eventos en Vivo
Los organizadores pueden registrar eventos durante partidos:
- Goles (normal, penal, tiro libre, autogol)
- Tarjetas (amarillas, rojas)
- Cambios de jugadores
- Actualización automática de marcadores y estadísticas

## Base de Datos

### Principales Entidades

- Usuario: Gestión de usuarios con roles
- Equipo: Equipos participantes
- Jugador: Jugadores con documentos y fotos
- Campeonato: Campeonatos deportivos
- Partido: Partidos programados
- Gol: Goles registrados
- Tarjeta: Tarjetas mostradas
- Alineacion: Alineaciones con posicionamiento
- Notificacion: Sistema de notificaciones

## API REST

La API sigue estándares REST y está documentada con Swagger/OpenAPI.

### Endpoints Principales

#### Autenticación
- POST /auth/register - Registro de usuario
- POST /auth/login - Inicio de sesión
- POST /auth/refresh - Renovar token
- POST /auth/logout - Cerrar sesión

#### Campeonatos
- GET /campeonatos - Listar campeonatos
- POST /campeonatos - Crear campeonato
- POST /campeonatos/{id}/generar-fixture - Generar fixture

#### Equipos
- GET /equipos - Listar equipos
- POST /equipos - Crear equipo
- GET /equipos/{id}/jugadores - Jugadores del equipo

#### Partidos
- GET /partidos - Listar partidos
- POST /gol - Registrar gol
- POST /tarjeta - Registrar tarjeta

#### Alineaciones
- POST /lider/alineaciones/definir - Definir alineación
- GET /lider/alineaciones/{partido_id} - Obtener alineación

## Seguridad

- Autenticación JWT con access y refresh tokens
- Rate limiting para prevenir ataques de fuerza bruta
- Bloqueo temporal de cuenta tras intentos fallidos
- Validación de documentos de jugadores
- CORS configurado para dominios permitidos
- Sanitización de inputs
- Logs de seguridad y auditoría

## Desarrollo

### Flujo de Trabajo Git (GitFlow)
```bash
# Crear feature
git checkout develop
git checkout -b feature/nueva-funcionalidad

# Desarrollar
git add .
git commit -m "feat: descripción de cambios"

# Finalizar feature
git checkout develop
git merge feature/nueva-funcionalidad
git push origin develop
```

### Convenciones de Commits

- feat: Nueva funcionalidad
- fix: Corrección de bug
- docs: Cambios en documentación
- style: Cambios de formato
- refactor: Refactorización
- test: Tests

### Tests
```bash
# Backend
cd backend
pytest

# Frontend
cd frontend
ng test
```

## Build para Producción

### Backend
```bash
# Configurar variables de entorno de producción
export FLASK_ENV=production
export DATABASE_URL=mysql://user:pass@host/db

# Ejecutar con gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 run:app
```

### Frontend
```bash
cd frontend
ng build --configuration production

# Los archivos se generan en dist/
# Servir con nginx o apache
```

## Troubleshooting

### Error de conexión a base de datos
Verificar credenciales en archivo .env y que MySQL esté corriendo.

### Puerto en uso
Cambiar puerto en configuración o detener proceso que lo usa.

### Módulos no encontrados
```bash
# Backend
pip install -r requirements.txt

# Frontend
npm install
```

### CORS errors
Verificar que el frontend esté en la lista de orígenes permitidos en backend.

## Documentación Adicional

- Manual Frontend: docs/Manual_Frontend_Cesar_Ramos.pdf
- Diagramas C4: docs/architecture/
- Contexto del Sistema: CONTEXTO_SISTEMA_C4.md
