# Contexto Técnico y Funcional del Sistema - Gestión de Campeonatos

## 📋 Resumen General del Sistema

### Propósito
Sistema integral de gestión de campeonatos de fútbol e indoor que permite administrar equipos, jugadores, partidos, alineaciones y estadísticas. Resuelve el problema de organizar y gestionar campeonatos deportivos de manera digital, facilitando la administración de equipos, seguimiento de partidos, registro de resultados y generación de estadísticas.

### Características Principales
- Gestión completa de campeonatos (creación, inscripciones, seguimiento)
- Administración de equipos y jugadores con validación de documentos
- Sistema de alineaciones con posicionamiento visual (drag & drop)
- Registro de eventos de partidos (goles, tarjetas, cambios)
- Generación automática de fixtures
- Sistema de notificaciones
- Estadísticas y tablas de posiciones
- Múltiples roles de usuario con permisos diferenciados
- Seguridad avanzada con autenticación JWT, rate limiting y protección contra ataques

---

## 👥 Actores / Usuarios

### 1. **Superadmin**
- **Rol en BD**: `superadmin`
- **Responsabilidades**:
  - Crear y gestionar organizadores (usuarios admin)
  - Ver estadísticas generales del sistema
  - Administrar todos los usuarios
  - Ver todos los campeonatos
  - Acceso completo al sistema

### 2. **Organizador (Admin)**
- **Rol en BD**: `admin`
- **Responsabilidades**:
  - Crear y gestionar campeonatos
  - Aprobar/rechazar solicitudes de equipos
  - Generar fixtures (calendarios de partidos)
  - Registrar resultados de partidos
  - Gestionar eventos durante partidos (goles, tarjetas)
  - Ver alineaciones de ambos equipos
  - Validar documentos de jugadores
  - Ver estadísticas y tablas de posiciones
  - Cambiar estados de campeonatos y partidos

### 3. **Líder de Equipo**
- **Rol en BD**: `lider`
- **Responsabilidades**:
  - Crear equipos
  - Gestionar jugadores del equipo (agregar, editar, subir documentos/fotos)
  - Inscribir equipos en campeonatos disponibles
  - Definir alineaciones para partidos (con posicionamiento visual)
  - Realizar cambios durante partidos
  - Ver estadísticas de su equipo
  - Ver notificaciones relacionadas con su equipo
  - Ver partidos del equipo

### 4. **Espectador**
- **Rol en BD**: `espectador`
- **Responsabilidades**:
  - Ver información pública de campeonatos
  - Consultar resultados y estadísticas
  - Ver tablas de posiciones

---

## 🔌 Sistemas Externos

### 1. **Servidor de Correo Electrónico (SMTP)**
- **Tipo**: SMTP (Gmail)
- **Propósito**: Envío de emails transaccionales
- **Uso**:
  - Verificación de email al registrarse
  - Envío de códigos de desbloqueo de cuenta
  - Envío de códigos de recuperación de contraseña
  - Envío de credenciales a organizadores creados por superadmin
- **Configuración**: Flask-Mail con servidor SMTP de Gmail

### 2. **Base de Datos Principal**
- **Tipo**: MySQL (o SQLite en desarrollo)
- **Base de datos**: `gestion_campeonato`
- **Propósito**: Almacenamiento principal de datos del sistema
- **Contenido**: Usuarios, equipos, jugadores, campeonatos, partidos, goles, tarjetas, notificaciones, etc.

### 3. **Base de Datos del Microservicio de Alineaciones**
- **Tipo**: MySQL
- **Base de datos**: `alineaciones_db`
- **Propósito**: Almacenamiento específico de alineaciones
- **Contenido**: Alineaciones de partidos con posiciones, formaciones, cambios

### 4. **Sistema de Archivos (Local)**
- **Propósito**: Almacenamiento de archivos subidos
- **Ubicación**: `/backend/uploads/`
- **Tipos de archivos**:
  - Logos de equipos y campeonatos (`/logos/`)
  - Documentos de jugadores (`/documentos_jugadores/`)
  - Fotos de jugadores (`/fotos_jugadores/`)

---

## 🏗️ Arquitectura General

### Tipo de Arquitectura
**Arquitectura híbrida**: Monolito modular con microservicios específicos

- **Backend Principal**: Aplicación monolítica Flask que gestiona la mayoría de funcionalidades
- **Microservicio de Alineaciones**: Servicio independiente Flask dedicado a la gestión de alineaciones
- **Frontend**: Aplicación Angular SPA (Single Page Application)

### Tecnologías Utilizadas

#### Backend Principal
- **Framework**: Flask 3.0.0
- **ORM**: SQLAlchemy (Flask-SQLAlchemy 3.1.1)
- **Migraciones**: Flask-Migrate 4.0.5
- **API REST**: Flask-RESTX 1.3.0 (documentación Swagger automática)
- **Autenticación**: Flask-JWT-Extended 4.6.0
- **Seguridad**: bcrypt 4.1.2 (hash de contraseñas)
- **CORS**: Flask-CORS 4.0.0
- **Email**: Flask-Mail 0.10.0
- **Base de datos**: PyMySQL 1.1.0 (driver MySQL)
- **Validación**: marshmallow 3.20.1
- **Variables de entorno**: python-dotenv 1.0.0

#### Microservicio de Alineaciones
- **Framework**: Flask 3.0.0
- **ORM**: SQLAlchemy (Flask-SQLAlchemy 3.1.1)
- **API REST**: Flask-RESTX 1.3.0
- **Autenticación**: Flask-JWT-Extended 4.6.0
- **HTTP Client**: requests 2.31.0
- **CORS**: Flask-CORS 4.0.0
- **Seguridad**: cryptography 41.0.7

#### Frontend
- **Framework**: Angular 21.0.0
- **Lenguaje**: TypeScript 5.9.2
- **UI Framework**: Angular Material 21.0.2
- **Routing**: Angular Router 21.0.0
- **HTTP Client**: HttpClient (Angular Common)
- **Estado Reactivo**: RxJS 7.8.0
- **Formularios**: Angular Forms 21.0.0
- **Date Picker**: ngx-daterangepicker-material 6.0.4

#### Base de Datos
- **Motor**: MySQL 8.0.43 (producción) o SQLite (desarrollo)
- **Características**: Relacional con relaciones complejas, índices, constraints

### Comunicación entre Componentes

#### Frontend ↔ Backend Principal
- **Protocolo**: HTTP/HTTPS
- **Formato**: JSON
- **Autenticación**: JWT Bearer Token
- **CORS**: Configurado para `http://localhost:4200` y `http://localhost:3000`
- **Puerto Backend**: 5000
- **Puerto Frontend**: 4200

#### Backend Principal ↔ Microservicio Alineaciones
- **Protocolo**: HTTP
- **Formato**: JSON
- **Autenticación**: JWT Bearer Token (misma secret key)
- **Patrón**: Proxy/Gateway (backend actúa como proxy para el frontend)
- **Puerto Microservicio**: 5001
- **Base URL**: `http://localhost:5001`

#### Backend ↔ Base de Datos Principal
- **Protocolo**: MySQL Protocol
- **Driver**: PyMySQL
- **ORM**: SQLAlchemy
- **Conexión**: Configurada via `DATABASE_URL` o SQLite

#### Microservicio ↔ Base de Datos Alineaciones
- **Protocolo**: MySQL Protocol
- **Driver**: PyMySQL
- **ORM**: SQLAlchemy
- **Conexión**: Base de datos independiente

---

## 🎯 Contexto C4 - Nivel 1 (Sistema)

### Sistema Principal
**Sistema de Gestión de Campeonatos**

### Usuarios Principales
1. **Superadmin** - Administrador del sistema
2. **Organizador (Admin)** - Crea y gestiona campeonatos
3. **Líder de Equipo** - Gestiona equipos y jugadores
4. **Espectador** - Consulta información pública

### Sistemas Externos
1. **Servidor SMTP** - Envío de correos electrónicos
2. **Base de Datos Principal** - Almacenamiento de datos del negocio
3. **Base de Datos Alineaciones** - Almacenamiento de alineaciones
4. **Sistema de Archivos** - Almacenamiento de documentos y medios

---

## 📦 Contenedores C4 - Nivel 2

### 1. **Frontend Web Application (Angular)**
- **Tecnología**: Angular 21
- **Puerto**: 4200
- **Responsabilidades**:
  - Interfaz de usuario para todos los roles
  - Gestión de autenticación y sesiones
  - Comunicación con APIs del backend
  - Enrutamiento y navegación
  - Componentes reutilizables (paginación, diálogos, etc.)
  - Guards de autenticación y autorización
  - Interceptores HTTP para manejo de tokens
  - Formularios reactivos
  - Visualización de datos (tablas, gráficos, tarjetas)

### 2. **Backend API Principal (Flask)**
- **Tecnología**: Flask 3.0
- **Puerto**: 5000
- **Responsabilidades**:
  - API REST para gestión de campeonatos, equipos, jugadores, partidos
  - Autenticación y autorización (JWT)
  - Validación de datos y sanitización
  - Gestión de seguridad (rate limiting, bloqueo de cuentas, logs)
  - Gestión de archivos (upload y servicio de archivos)
  - Lógica de negocio principal
  - Generación de fixtures
  - Cálculo de estadísticas
  - Proxy/Gateway hacia microservicio de alineaciones
  - Servicio de correo electrónico
  - Swagger/OpenAPI documentation

### 3. **Microservicio de Alineaciones (Flask)**
- **Tecnología**: Flask 3.0
- **Puerto**: 5001
- **Responsabilidades**:
  - API REST específica para gestión de alineaciones
  - Almacenamiento de alineaciones con posicionamiento
  - Gestión de cambios durante partidos
  - Validación de alineaciones (titulares, suplentes)
  - Comunicación con backend principal para validar datos (partidos, equipos, jugadores)

### 4. **Base de Datos Principal (MySQL)**
- **Tecnología**: MySQL 8.0
- **Responsabilidades**:
  - Almacenamiento persistente de:
    - Usuarios y autenticación
    - Equipos y jugadores
    - Campeonatos y partidos
    - Goles y tarjetas
    - Notificaciones
    - Solicitudes de equipos
    - Historial de estados
    - Tokens (blacklist, refresh tokens)
    - Logs de seguridad
    - Intentos de login
    - Bloqueos de cuenta

### 5. **Base de Datos Alineaciones (MySQL)**
- **Tecnología**: MySQL 8.0
- **Responsabilidades**:
  - Almacenamiento persistente de:
    - Alineaciones de partidos
    - Posiciones de jugadores (x, y)
    - Formaciones
    - Minutos de entrada y salida
    - Cambios durante partidos

### 6. **Sistema de Archivos (Local)**
- **Tecnología**: Sistema de archivos del servidor
- **Responsabilidades**:
  - Almacenamiento de archivos binarios:
    - Logos de equipos y campeonatos
    - Documentos PDF de jugadores
    - Fotos de jugadores
  - Servicio de archivos estáticos vía endpoint `/uploads/<path:filename>`

---

## 🔧 Componentes C4 - Nivel 3

### Backend Principal - Estructura de Componentes

#### **Módulo de Autenticación y Seguridad** (`app/routes/auth_routes.py`)
- **Responsabilidades**:
  - Registro de usuarios (solo Gmail)
  - Login con protección contra fuerza bruta
  - Verificación de email
  - Refresh de tokens
  - Logout y revocación de tokens
  - Desbloqueo de cuenta
  - Recuperación de contraseña
  - Gestión de superadmin (crear organizadores)

#### **Módulo de Campeonatos** (`app/routes/campeonato_routes.py`)
- **Responsabilidades**:
  - CRUD de campeonatos
  - Generación de códigos de inscripción
  - Cambio de estados de campeonatos
  - Listado de campeonatos con filtros

#### **Módulo de Equipos** (`app/routes/equipo_routes.py`)
- **Responsabilidades**:
  - CRUD de equipos
  - Aprobación/rechazo de equipos
  - Listado de equipos con filtros

#### **Módulo de Jugadores** (`app/routes/jugador_routes.py`)
- **Responsabilidades**:
  - CRUD de jugadores
  - Validación de documentos únicos
  - Gestión de dorsales por equipo
  - Upload de documentos y fotos

#### **Módulo de Partidos** (`app/routes/partido_routes.py`)
- **Responsabilidades**:
  - CRUD de partidos
  - Generación automática de fixtures
  - Cambio de estados de partidos
  - Listado con filtros (por campeonato, equipo, fecha, estado)

#### **Módulo de Goles** (`app/routes/gol_routes.py`)
- **Responsabilidades**:
  - Registro de goles en partidos
  - Diferentes tipos de goles (normal, penal, autogol, tiro libre)
  - Actualización automática de marcadores
  - Listado de goleadores

#### **Módulo de Tarjetas** (`app/routes/tarjeta_routes.py`)
- **Responsabilidades**:
  - Registro de tarjetas (amarillas, rojas)
  - Asociación con jugadores y partidos
  - Estadísticas de tarjetas

#### **Módulo de Solicitudes** (`app/routes/solicitud_equipo_routes.py`)
- **Responsabilidades**:
  - Gestión de solicitudes de inscripción a campeonatos
  - Aprobación/rechazo por organizadores
  - Listado de solicitudes pendientes

#### **Módulo de Notificaciones** (`app/routes/notificacion_routes.py`)
- **Responsabilidades**:
  - Creación y envío de notificaciones
  - Listado de notificaciones por usuario
  - Marcar como leídas

#### **Módulo de Estadísticas** (`app/routes/estadisticas_routes.py`)
- **Responsabilidades**:
  - Cálculo de tablas de posiciones
  - Estadísticas de equipos y jugadores
  - Goleadores y tarjetas
  - Estadísticas de campeonatos

#### **Módulo de Upload** (`app/routes/upload_routes.py`)
- **Responsabilidades**:
  - Upload de logos (equipos, campeonatos)
  - Upload de documentos de jugadores
  - Upload de fotos de jugadores
  - Validación de tipos y tamaños de archivo

#### **Módulo Proxy Alineaciones** (`app/routes/alineaciones_proxy_routes.py`)
- **Responsabilidades**:
  - Proxy para endpoints de alineaciones
  - Validación de permisos antes de delegar al microservicio
  - Agregación de datos de alineaciones para organizadores

#### **Módulo de Eventos** (`app/routes/eventos_routes.py`)
- **Responsabilidades**:
  - Gestión de eventos durante partidos
  - Integración de goles, tarjetas y cambios

#### **Módulo Superadmin** (`app/routes/superadmin_routes.py`)
- **Responsabilidades**:
  - Dashboard de superadmin
  - Gestión de organizadores
  - Estadísticas globales

#### **Módulo Líder** (`app/routes/lider_routes.py`)
- **Responsabilidades**:
  - Endpoints específicos para líderes de equipo
  - Gestión de mis equipos
  - Campeonatos disponibles

#### **Módulo Historial de Estados** (`app/routes/historial_estado_routes.py`)
- **Responsabilidades**:
  - Auditoría de cambios de estado
  - Historial de campeonatos y partidos

#### **Servicios de Seguridad** (`app/security/`)
- **TokenManager** (`token_manager.py`):
  - Creación y gestión de tokens JWT
  - Revocación de tokens
  - Renovación de access tokens
- **LoginTracker** (`login_tracker.py`):
  - Seguimiento de intentos de login
  - Bloqueo automático de cuentas
  - Generación de códigos de desbloqueo
- **EmailService** (`email_service.py`):
  - Envío de emails transaccionales
  - Plantillas de email
- **RateLimiter** (`rate_limiter.py`):
  - Control de tasa de peticiones
  - Protección contra ataques DDoS
- **SecurityLogger** (`security_logger.py`):
  - Registro de eventos de seguridad
  - Auditoría de accesos

#### **Middlewares** (`app/middlewares/`)
- **AuthMiddleware** (`auth_middleware.py`):
  - Verificación de roles
  - Decoradores de autorización
- **RateLimitMiddleware** (`rate_limit_middleware.py`):
  - Decorador de rate limiting
  - Control de peticiones por IP/usuario

#### **Utilidades** (`app/utils/`)
- **Validators** (`validators.py`):
  - Validación de emails
  - Validación de datos
- **Sanitizer** (`sanitizer.py`):
  - Sanitización de inputs
  - Prevención de inyección XSS
- **ErrorHandlers** (`error_handlers.py`):
  - Manejo centralizado de errores
  - Formateo de respuestas de error

#### **Modelos** (`app/models/`)
- **Usuario**: Usuarios del sistema con roles
- **Equipo**: Equipos de fútbol/indoor
- **Jugador**: Jugadores con documentos y fotos
- **Campeonato**: Campeonatos deportivos
- **CampeonatoEquipo**: Relación muchos-a-muchos (inscripciones)
- **Partido**: Partidos de campeonatos
- **Gol**: Goles en partidos
- **Tarjeta**: Tarjetas (amarillas/rojas)
- **Notificacion**: Notificaciones para usuarios
- **SolicitudEquipo**: Solicitudes de inscripción
- **HistorialEstado**: Auditoría de cambios de estado
- **TokenBlacklist**: Tokens revocados
- **RefreshToken**: Refresh tokens activos
- **LoginAttempt**: Intentos de login
- **AccountLockout**: Bloqueos temporales
- **SecurityLog**: Logs de seguridad
- **RateLimit**: Registros de rate limiting

### Microservicio de Alineaciones - Estructura de Componentes

#### **Módulo de Alineaciones** (`app/routes/alineacion_routes.py`)
- **Responsabilidades**:
  - Crear alineaciones individuales
  - Definir alineación completa (titulares, suplentes, posiciones)
  - Obtener alineaciones de un partido/equipo
  - Eliminar alineaciones
  - Realizar cambios durante partidos
  - Auto-generar alineaciones (pruebas)

#### **Cliente API Backend** (`app/services/backend_api_client.py`)
- **Responsabilidades**:
  - Comunicación HTTP con backend principal
  - Validación de partidos, equipos y jugadores
  - Obtención de datos enriquecidos

#### **Modelo Alineacion** (`app/models/alineacion.py`)
- **Responsabilidades**:
  - Almacenamiento de alineaciones
  - Posiciones (x, y) para drag & drop
  - Formaciones (4-4-2, 3-5-2, etc.)
  - Minutos de entrada y salida

### Frontend - Estructura de Componentes

#### **Core Services** (`app/core/services/`)
- **AuthService**:
  - Gestión de autenticación
  - Almacenamiento de tokens en localStorage
  - Signals reactivos para estado de usuario
  - Métodos de login, logout, registro

#### **Core Guards** (`app/core/guards/`)
- **AuthGuard**: Protección de rutas autenticadas
- **LiderGuard**: Acceso solo para líderes
- **OrganizadorGuard**: Acceso solo para organizadores

#### **Core Interceptors** (`app/core/interceptors/`)
- **AuthInterceptor**: Inyección automática de tokens JWT
  - Manejo de tokens expirados
  - Refresh automático de tokens

#### **Features - Auth** (`app/features/auth/`)
- **LoginComponent**: Inicio de sesión
- **RegisterComponent**: Registro de usuarios
- **VerifyEmailComponent**: Verificación de email
- **UnlockAccountComponent**: Desbloqueo de cuenta
- **ForgotPasswordComponent**: Recuperación de contraseña

#### **Features - Organizador** (`app/features/organizador/`)
- **DashboardComponent**: Panel principal del organizador
- **CrearCampeonatoComponent**: Creación de campeonatos
- **MiCampeonatoComponent**: Gestión del campeonato
- **EquiposComponent**: Listado de equipos
- **PartidosComponent**: Gestión de partidos
- **GenerarFixtureComponent**: Generación de calendarios
- **PartidoDetalleComponent**: Detalle y eventos de partido
- **PartidoAlineacionesComponent**: Visualización de alineaciones
- **TablaPosicionesComponent**: Tabla de posiciones
- **GoleadoresComponent**: Lista de goleadores
- **EstadisticasComponent**: Estadísticas generales
- **VerSolicitudesComponent**: Revisión de solicitudes
- **RevisarSolicitudComponent**: Detalle de solicitud

#### **Features - Líder Equipo** (`app/features/lider-equipo/`)
- **DashboardComponent**: Panel principal del líder
- **MisEquiposComponent**: Gestión de equipos del líder
- **JugadoresComponent**: Gestión de jugadores
- **PartidosComponent**: Partidos del equipo
- **AlineacionesComponent**: Definir alineaciones
- **FormacionesComponent**: Gestión de formaciones
- **PartidoDetalleComponent**: Detalle de partido
- **EstadisticasComponent**: Estadísticas del equipo
- **CampeonatosDisponiblesComponent**: Campeonatos para inscribirse
- **NotificacionesComponent**: Notificaciones del líder

#### **Features - Superadmin** (`app/features/superadmin/`)
- **DashboardComponent**: Panel principal del superadmin
- **OrganizadoresComponent**: Gestión de organizadores
- **OrganizadorDetalleComponent**: Detalle de organizador
- **CampeonatosComponent**: Ver todos los campeonatos
- **UsuariosComponent**: Gestión de usuarios

#### **Shared Components** (`app/shared/components/`)
- **ConfirmDialogComponent**: Diálogos de confirmación
- **PaginationComponent**: Paginación reutilizable
- **ImagePlaceholderComponent**: Placeholder para imágenes
- **DatepickerComponent**: Selector de fechas
- **ValidadorJugadoresComponent**: Validador de jugadores
- **AccessibilityCenterComponent**: Centro de accesibilidad

#### **Services por Feature**
- **OrganizadorService**: Llamadas API para organizador
- **LiderEquipoService**: Llamadas API para líder
- **SuperadminService**: Llamadas API para superadmin
- **FormacionesService**: Gestión de formaciones

---

## 🔄 Flujos Principales

### 1. **Flujo de Registro y Verificación**
1. Usuario completa formulario de registro (solo Gmail)
2. Frontend envía POST `/auth/register`
3. Backend valida email y crea usuario (inactivo)
4. Backend genera token de verificación
5. Backend envía email con link de verificación
6. Usuario hace clic en link
7. Frontend llama GET `/auth/verify-email?token=xxx`
8. Backend activa cuenta y marca email como verificado
9. Usuario puede iniciar sesión

### 2. **Flujo de Autenticación**
1. Usuario ingresa credenciales en frontend
2. Frontend envía POST `/auth/login`
3. Backend valida credenciales
4. Backend verifica email verificado y cuenta activa
5. Backend verifica intentos fallidos (bloqueo si aplica)
6. Backend genera tokens (access + refresh)
7. Frontend almacena tokens en localStorage
8. Frontend redirige según rol del usuario
9. Interceptor HTTP agrega token automáticamente a peticiones

### 3. **Flujo de Refresh Token**
1. Frontend detecta token expirado (401)
2. Frontend llama POST `/auth/refresh` con refresh token
3. Backend valida refresh token
4. Backend genera nuevo access token
5. Frontend actualiza access token en localStorage
6. Frontend reintenta petición original con nuevo token

### 4. **Flujo de Creación de Campeonato**
1. Organizador completa formulario
2. Frontend envía POST `/campeonatos`
3. Backend valida permisos (rol admin)
4. Backend crea campeonato (estado: planificacion)
5. Backend genera código de inscripción si es privado
6. Frontend muestra mensaje de éxito
7. Organizador puede gestionar campeonato

### 5. **Flujo de Inscripción de Equipo**
1. Líder busca campeonatos disponibles
2. Líder selecciona campeonato y envía solicitud
3. Frontend llama POST `/inscripciones`
4. Backend crea solicitud (estado: pendiente)
5. Backend crea notificación para organizador
6. Organizador revisa solicitud
7. Organizador aprueba/rechaza
8. Backend actualiza estado de solicitud
9. Backend crea registro en `campeonato_equipo` si aprobada
10. Backend crea notificación para líder

### 6. **Flujo de Generación de Fixture**
1. Organizador inicia generación de fixture
2. Frontend llama POST `/campeonatos/{id}/generar-fixture`
3. Backend valida que hay equipos aprobados suficientes
4. Backend genera partidos según tipo de competición (liga/eliminación/mixto)
5. Backend calcula jornadas y fechas
6. Backend crea registros de partidos
7. Backend actualiza estado de campeonato
8. Frontend muestra partidos generados

### 7. **Flujo de Definición de Alineación**
1. Líder accede a partido próximo
2. Frontend obtiene jugadores del equipo
3. Líder arrastra jugadores en cancha visual (drag & drop)
4. Líder define titulares y suplentes
5. Frontend envía POST `/lider/alineaciones/definir`
6. Backend valida permisos y datos
7. Backend actúa como proxy y envía a microservicio
8. Microservicio valida partido y jugadores con backend principal
9. Microservicio elimina alineaciones previas
10. Microservicio crea nuevas alineaciones con posiciones
11. Microservicio retorna respuesta
12. Backend retorna respuesta al frontend
13. Frontend muestra confirmación

### 8. **Flujo de Inicio de Partido**
1. Organizador accede a partido programado
2. Organizador valida alineaciones (GET `/organizador/partidos/{id}/validar-alineaciones`)
3. Backend consulta alineaciones en microservicio
4. Si ambas alineaciones están, organizador puede iniciar
5. Organizador cambia estado a "en_juego"
6. Frontend actualiza vista del partido

### 9. **Flujo de Registro de Gol**
1. Partido en estado "en_juego"
2. Organizador ingresa gol (jugador, minuto, tipo)
3. Frontend envía POST `/gol`
4. Backend valida partido y jugador
5. Backend crea registro de gol
6. Backend actualiza marcador del partido automáticamente
7. Frontend actualiza vista en tiempo real

### 10. **Flujo de Cambio Durante Partido**
1. Líder quiere hacer cambio
2. Líder selecciona jugador que sale y que entra
3. Frontend envía POST `/lider/alineaciones/cambio`
4. Backend valida partido en estado "en_juego"
5. Backend actúa como proxy hacia microservicio
6. Microservicio valida jugadores en alineación
7. Microservicio actualiza minutos de entrada/salida
8. Frontend actualiza alineación mostrada

### 11. **Flujo de Finalización de Partido**
1. Organizador marca partido como finalizado
2. Frontend envía PATCH `/partidos/{id}` (estado: finalizado)
3. Backend actualiza estado
4. Backend actualiza estadísticas (puntos, goles a favor/contra)
5. Backend crea notificaciones para líderes de equipos
6. Frontend actualiza tabla de posiciones

### 12. **Flujo de Bloqueo de Cuenta**
1. Usuario intenta login con contraseña incorrecta
2. Backend registra intento fallido
3. Si alcanza 5 intentos, Backend bloquea cuenta (10 min)
4. Backend genera código de desbloqueo de 6 dígitos
5. Backend envía código por email
6. Usuario ingresa código en frontend
7. Frontend envía POST `/auth/unlock`
8. Backend valida código y desbloquea cuenta
9. Usuario puede iniciar sesión

---

## 📊 Dependencias Críticas

### Dependencias del Backend Principal
- **MySQL/SQLite**: Crítica - Sin BD no funciona el sistema
- **Servidor SMTP**: Importante - Sin email no se pueden verificar cuentas ni recuperar contraseñas
- **Microservicio de Alineaciones**: Importante - Sin él no se pueden gestionar alineaciones, pero el sistema puede funcionar parcialmente
- **Sistema de Archivos**: Importante - Sin él no se pueden subir logos/documentos, pero el sistema funciona

### Dependencias del Microservicio de Alineaciones
- **Backend Principal**: Crítica - Necesita validar partidos, equipos y jugadores
- **MySQL Alineaciones**: Crítica - Sin BD no puede almacenar alineaciones
- **Misma JWT Secret Key**: Crítica - Necesaria para validar tokens

### Dependencias del Frontend
- **Backend Principal**: Crítica - Todas las funcionalidades dependen de él
- **LocalStorage del Navegador**: Importante - Para persistir tokens y sesión

---

## 📝 Observaciones Relevantes para Diagramado C4

### Para Diagrama de Contexto (Nivel 1)
- Mostrar claramente los 4 tipos de usuarios con sus relaciones
- Destacar que el sistema tiene 2 bases de datos separadas
- Incluir el servidor SMTP como sistema externo
- El sistema de archivos puede mostrarse como sistema externo o como parte del backend

### Para Diagrama de Contenedores (Nivel 2)
- Mostrar claramente la separación entre Backend Principal y Microservicio
- Indicar que el Backend Principal actúa como proxy para alineaciones
- Mostrar las 2 bases de datos como contenedores separados
- Indicar los puertos de cada servicio (4200, 5000, 5001)
- Mostrar que el Frontend se comunica directamente con Backend Principal, y el Backend Principal se comunica con el Microservicio
- El Sistema de Archivos puede mostrarse como contenedor o como parte del Backend

### Para Diagrama de Componentes (Nivel 3)
- Backend Principal: Mostrar los principales módulos de rutas, servicios de seguridad, middlewares, modelos
- Microservicio: Mostrar módulo de alineaciones, cliente API backend, modelo
- Frontend: Agrupar por features (auth, organizador, líder, superadmin) y mostrar servicios core
- Mostrar la comunicación entre componentes (especialmente el proxy de alineaciones)

### Relaciones Importantes a Destacar
1. **Backend ↔ Microservicio**: Comunicación HTTP, validación de tokens compartida
2. **Frontend ↔ Backend**: JWT Bearer Token en todas las peticiones (excepto auth pública)
3. **Microservicio ↔ Backend**: El microservicio consulta datos al backend para validaciones
4. **Backend ↔ SMTP**: Comunicación para envío de emails
5. **Backend ↔ BD Principal**: ORM SQLAlchemy
6. **Microservicio ↔ BD Alineaciones**: ORM SQLAlchemy independiente

### Tecnologías Clave a Mencionar
- Flask para backends
- Angular para frontend
- MySQL para bases de datos
- JWT para autenticación
- REST API para comunicación
- SQLAlchemy para ORM

### Seguridad a Destacar
- Autenticación JWT con refresh tokens
- Rate limiting
- Bloqueo de cuentas por intentos fallidos
- Sanitización de inputs
- CORS configurado
- Logs de seguridad
- Blacklist de tokens

---

## 🔍 Detalles Técnicos Adicionales

### Configuración de Ambientes
- **Desarrollo**: SQLite, debug activado, CORS permisivo
- **Producción**: MySQL, debug desactivado, JWT secret key desde variables de entorno

### Patrones Arquitectónicos Utilizados
- **API Gateway/Proxy**: Backend principal actúa como proxy para microservicio
- **Repository Pattern**: Modelos SQLAlchemy actúan como repositorios
- **Service Layer**: Servicios de seguridad separados de lógica de negocio
- **Middleware Pattern**: Middlewares para autenticación y rate limiting
- **Interceptor Pattern**: Frontend usa interceptores HTTP para tokens

### Escalabilidad
- El microservicio de alineaciones puede escalarse independientemente
- La base de datos principal puede escalarse verticalmente
- El frontend es estático y puede servirse desde CDN
- El backend principal puede escalarse horizontalmente con load balancer

### Monitoreo y Logging
- Logs de seguridad en base de datos
- Logs de intentos de login
- Logs de eventos importantes (creación, actualización, eliminación)
- Historial de estados para auditoría

---

**Documento generado para diagramación C4 con Structurizr**
**Fecha**: Análisis completo del sistema
**Versión del Sistema**: 1.0


