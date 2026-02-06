# Documentación Técnica del Backend - Sistema de Gestión de Campeonatos

## 1. Introducción

El sistema de gestión de campeonatos es una plataforma backend diseñada para administrar campeonatos deportivos barriales, específicamente orientada a fútbol e indoor. El backend está compuesto por dos componentes principales: un backend principal que gestiona la lógica de negocio central y un microservicio especializado en la gestión de alineaciones de partidos.

El backend principal actúa como el núcleo del sistema, manejando todas las operaciones relacionadas con usuarios, equipos, jugadores, campeonatos, partidos, goles, tarjetas y notificaciones. El microservicio de alineaciones se encarga exclusivamente de la gestión de las alineaciones de los equipos para cada partido, incluyendo la definición de titulares, suplentes y cambios durante el partido.

Esta arquitectura híbrida permite separar responsabilidades, facilitar el mantenimiento y escalar componentes de forma independiente según las necesidades del sistema.

## 2. Tecnologías Utilizadas

### 2.1 Lenguaje de Programación

- **Python 3.x**: Lenguaje principal utilizado en ambos componentes del backend.

### 2.2 Framework Backend

- **Flask 3.0.0**: Framework web ligero y flexible utilizado tanto en el backend principal como en el microservicio.
- **Flask-RESTX 1.3.0**: Extensión de Flask que proporciona funcionalidades RESTful y documentación automática mediante Swagger/OpenAPI.

### 2.3 Base de Datos y ORM

- **Flask-SQLAlchemy 3.1.1**: ORM (Object-Relational Mapping) que facilita la interacción con la base de datos mediante objetos Python.
- **Flask-Migrate 4.0.5**: Herramienta para gestionar migraciones de esquema de base de datos.
- **PyMySQL 1.1.0**: Conector Python para MySQL, utilizado para la comunicación con el motor de base de datos.
- **MySQL**: Motor de base de datos relacional utilizado en producción. El sistema también soporta SQLite para desarrollo mediante configuración.

### 2.4 Autenticación y Seguridad

- **Flask-JWT-Extended 4.6.0**: Biblioteca para implementar autenticación basada en tokens JWT (JSON Web Tokens).
- **bcrypt 4.1.2**: Biblioteca para el hashing seguro de contraseñas.
- **cryptography 41.0.7**: Biblioteca criptográfica utilizada en el microservicio para operaciones de seguridad adicionales.

### 2.5 Comunicación y CORS

- **Flask-CORS 4.0.0**: Middleware para habilitar Cross-Origin Resource Sharing (CORS), permitiendo que el frontend se comunique con el backend desde diferentes orígenes.
- **requests 2.31.0**: Biblioteca HTTP utilizada en el microservicio para realizar peticiones al backend principal.

### 2.6 Utilidades y Herramientas

- **python-dotenv 1.0.0**: Biblioteca para cargar variables de entorno desde archivos `.env`.
- **marshmallow 3.20.1**: Biblioteca para serialización y validación de datos.
- **Flask-Mail 0.10.0**: Extensión para el envío de correos electrónicos (notificaciones, recuperación de contraseña, códigos de desbloqueo).
- **Werkzeug 3.0.1**: Biblioteca WSGI utilizada por Flask para el manejo de peticiones HTTP.

### 2.7 Protocolos de Comunicación

- **HTTP/HTTPS**: Protocolo utilizado para la comunicación entre componentes.
- **REST**: Arquitectura de estilo de comunicación utilizada para exponer los endpoints de la API.

## 3. Arquitectura del Sistema

### 3.1 Arquitectura Cliente-Servidor

El sistema implementa una arquitectura cliente-servidor tradicional donde:

- **Cliente**: Aplicaciones frontend (web y móvil) que realizan peticiones HTTP al servidor.
- **Servidor**: Backend principal que procesa las peticiones, ejecuta la lógica de negocio y gestiona la persistencia de datos.

El backend principal expone una API REST que permite a los clientes realizar operaciones CRUD (Create, Read, Update, Delete) sobre los recursos del sistema. La comunicación se realiza mediante peticiones HTTP estándar, utilizando métodos GET, POST, PUT, PATCH y DELETE según la operación requerida.

La autenticación se gestiona mediante tokens JWT, donde el cliente envía credenciales (email y contraseña) y recibe un token de acceso que debe incluir en las peticiones subsiguientes mediante el header `Authorization: Bearer <token>`.

### 3.2 Microservicio

El sistema incorpora un microservicio especializado en la gestión de alineaciones (`alineaciones-service`), que opera de forma independiente del backend principal. Este microservicio:

- **Base de datos propia**: Mantiene su propia base de datos (`alineaciones_db`) con la tabla `alineaciones` que almacena la información de las alineaciones de cada partido.
- **Puerto independiente**: Se ejecuta en el puerto 5001, mientras que el backend principal utiliza el puerto 5000.
- **Responsabilidad única**: Se enfoca exclusivamente en la gestión de alineaciones, incluyendo:
  - Creación y consulta de alineaciones
  - Definición de titulares y suplentes con posiciones en cancha
  - Gestión de cambios durante el partido
  - Validación de jugadores en equipos

La existencia de este microservicio se justifica por:

1. **Separación de responsabilidades**: Las alineaciones requieren lógica específica y compleja que puede evolucionar independientemente.
2. **Escalabilidad**: El microservicio puede escalarse de forma independiente si la carga de trabajo relacionada con alineaciones aumenta.
3. **Mantenibilidad**: Facilita el mantenimiento y actualización de la funcionalidad de alineaciones sin afectar el backend principal.
4. **Base de datos especializada**: Permite optimizar el esquema de datos específicamente para alineaciones.

### 3.3 Integración entre Backend y Microservicio

La comunicación entre el backend principal y el microservicio se realiza mediante peticiones HTTP REST:

#### 3.3.1 Comunicación Backend → Microservicio

El backend principal actúa como proxy para algunas operaciones relacionadas con alineaciones. Cuando un cliente solicita información sobre alineaciones, el backend:

1. Valida la autenticación y autorización del usuario.
2. Realiza validaciones de negocio (verificar que el partido existe, que el equipo participa en el partido, etc.).
3. Realiza peticiones HTTP al microservicio utilizando la biblioteca `requests`.
4. Procesa y enriquece la respuesta del microservicio con información adicional del backend principal.
5. Retorna la respuesta al cliente.

**Endpoints del proxy en el backend principal:**

- `GET /organizador/partidos/<id_partido>/alineaciones`: Obtiene las alineaciones de ambos equipos para un partido.
- `GET /organizador/partidos/<id_partido>/validar-alineaciones`: Valida que ambos equipos hayan subido alineación.
- `POST /lider/alineaciones/definir`: Proxy para definir alineación en el microservicio.
- `GET /lider/alineaciones`: Proxy para obtener alineaciones del microservicio.
- `POST /lider/alineaciones/cambio`: Proxy para realizar cambios durante el partido.

#### 3.3.2 Comunicación Microservicio → Backend

El microservicio necesita consultar información del backend principal para validar datos y enriquecer sus respuestas. Para esto, implementa un cliente HTTP (`BackendAPIClient`) que realiza peticiones al backend principal:

- `GET /partidos/<id_partido>`: Consulta información de un partido.
- `GET /equipos/<id_equipo>`: Consulta información de un equipo.
- `GET /jugadores/<id_jugador>`: Consulta información de un jugador.
- `GET /jugadores?id_equipo=<id_equipo>`: Obtiene la lista de jugadores de un equipo.

**Flujo de datos:**

1. Cliente realiza petición al microservicio.
2. Microservicio valida el token JWT (comparte la misma secret key que el backend principal).
3. Microservicio consulta información necesaria al backend principal mediante `BackendAPIClient`.
4. Microservicio procesa la lógica específica de alineaciones.
5. Microservicio retorna respuesta al cliente (o al backend si es una petición proxy).

#### 3.3.3 Autenticación Compartida

Ambos servicios comparten la misma `JWT_SECRET_KEY`, lo que permite que:

- Un token generado por el backend principal sea válido en el microservicio.
- El microservicio pueda validar la autenticación del usuario sin necesidad de re-autenticación.
- El backend principal pueda reenviar el token del cliente al microservicio en las peticiones proxy.

## 4. Base de Datos

### 4.1 Motor de Base de Datos

El sistema utiliza **MySQL** como motor de base de datos principal en producción. La configuración permite alternar entre MySQL y SQLite para desarrollo mediante la variable de entorno `USE_SQLITE`.

**Backend Principal:**
- Base de datos: `gestion_campeonato`
- Conexión por defecto: `mysql+pymysql://root:cesar05@localhost/gestion_campeonato`
- Soporte para SQLite en desarrollo mediante configuración.

**Microservicio:**
- Base de datos: `alineaciones_db`
- Conexión: `mysql+pymysql://root:cesar05@localhost/alineaciones_db`
- Base de datos independiente para mantener la separación de responsabilidades.

### 4.2 Estructura General

El backend principal gestiona múltiples entidades principales organizadas en las siguientes categorías:

#### 4.2.1 Entidades Principales

1. **Usuario**: Representa a los usuarios del sistema (superadmin, admin, líder, espectador).
2. **Equipo**: Representa a los equipos deportivos que participan en campeonatos.
3. **Jugador**: Representa a los jugadores que pertenecen a equipos.
4. **Campeonato**: Representa los campeonatos deportivos organizados.
5. **CampeonatoEquipo**: Tabla de relación muchos-a-muchos entre campeonatos y equipos (inscripciones).
6. **Partido**: Representa los partidos entre equipos dentro de un campeonato.
7. **Gol**: Representa los goles anotados en un partido.
8. **Tarjeta**: Representa las tarjetas (amarillas/rojas) mostradas en un partido.
9. **Notificacion**: Representa las notificaciones enviadas a usuarios.
10. **SolicitudEquipo**: Representa las solicitudes de creación de equipos.
11. **HistorialEstado**: Registra los cambios de estado de entidades (campeonatos, partidos, etc.).
12. **PreferenciasUsuario**: Almacena las preferencias de configuración de usuarios.

#### 4.2.2 Entidades de Seguridad

1. **TokenBlacklist**: Almacena tokens JWT revocados (logout, cambio de contraseña).
2. **RefreshToken**: Almacena tokens de actualización para renovar access tokens.
3. **LoginAttempt**: Registra intentos de inicio de sesión (exitosos y fallidos).
4. **AccountLockout**: Registra bloqueos temporales de cuentas por intentos fallidos.
5. **SecurityLog**: Registro de auditoría de eventos de seguridad.
6. **RateLimit**: Control de límites de peticiones por IP/usuario.

#### 4.2.3 Entidades del Microservicio

1. **Alineacion**: Almacena las alineaciones de jugadores para cada partido, incluyendo:
   - Relación con partido, equipo y jugador
   - Indicador de titular/suplente
   - Minuto de entrada y salida
   - Posiciones en cancha (posicion_x, posicion_y) para visualización
   - Formación del equipo

### 4.3 Acceso y Persistencia de Datos

El acceso a la base de datos se realiza mediante **SQLAlchemy ORM**, que proporciona:

- **Abstracción de la base de datos**: El código utiliza objetos Python en lugar de SQL directo.
- **Mapeo objeto-relacional**: Cada tabla tiene una clase modelo correspondiente que hereda de `db.Model`.
- **Relaciones**: SQLAlchemy gestiona automáticamente las relaciones entre entidades mediante `db.relationship()` y `db.ForeignKey()`.
- **Migraciones**: Flask-Migrate permite gestionar cambios en el esquema de forma versionada.

**Ejemplo de modelo:**

```python
class Usuario(db.Model):
    __tablename__ = 'usuarios'
    id_usuario = db.Column(db.Integer, primary_key=True, autoincrement=True)
    email = db.Column(db.String(100), unique=True, nullable=False)
    contrasena = db.Column(db.String(255), nullable=False)
    rol = db.Column(db.Enum('superadmin', 'admin', 'lider', 'espectador'))
    # ... más campos
```

**Operaciones CRUD típicas:**

- **Create**: `nuevo_usuario = Usuario(...)` → `db.session.add(nuevo_usuario)` → `db.session.commit()`
- **Read**: `usuario = Usuario.query.get(id)` o `Usuario.query.filter_by(email=email).first()`
- **Update**: Modificar atributos del objeto → `db.session.commit()`
- **Delete**: `db.session.delete(usuario)` → `db.session.commit()`

**Transacciones:**

SQLAlchemy utiliza sesiones para gestionar transacciones. Los cambios se agrupan en una transacción y se confirman con `db.session.commit()`. En caso de error, se puede hacer rollback con `db.session.rollback()`.

## 5. Patrones de Diseño Utilizados

### 5.1 Patrón MVC (Model-View-Controller)

El sistema implementa una variante del patrón MVC adaptada a Flask:

- **Model**: Representado por las clases en `app/models/` que heredan de `db.Model`. Cada modelo representa una entidad de la base de datos y contiene la lógica de acceso a datos.
- **View**: En Flask-RESTX, las vistas son los recursos (`Resource`) definidos en `app/routes/`. Cada recurso maneja las peticiones HTTP y retorna respuestas JSON.
- **Controller**: La lógica de control está distribuida entre las rutas y los servicios. Las rutas validan la entrada, llaman a servicios si es necesario, y formatean la respuesta.

**Ejemplo:**
- Model: `Usuario` en `app/models/usuario.py`
- View/Controller: `Register` en `app/routes/auth_routes.py` que maneja `POST /auth/register`

### 5.2 Patrón Repository

Aunque no está explícitamente nombrado como tal, el sistema utiliza un patrón similar al Repository mediante SQLAlchemy. Los modelos actúan como repositorios proporcionando métodos de consulta:

- `Usuario.query.get(id)`: Obtener por ID
- `Usuario.query.filter_by(email=email).first()`: Buscar por criterios
- `Equipo.query.all()`: Obtener todos

Este patrón abstrae el acceso a datos y facilita el cambio del motor de base de datos sin modificar la lógica de negocio.

### 5.3 Patrón Service

El sistema implementa servicios especializados para lógica de negocio compleja:

- **TokenManager** (`app/security/token_manager.py`): Gestiona la creación, validación y revocación de tokens JWT.
- **EmailService** (`app/security/email_service.py`): Gestiona el envío de correos electrónicos.
- **LoginTracker** (`app/security/login_tracker.py`): Rastrea intentos de login y gestiona bloqueos de cuenta.
- **RateLimiter** (`app/security/rate_limiter.py`): Controla el límite de peticiones por IP/usuario.
- **BackendAPIClient** (`alineaciones-service/app/services/backend_api_client.py`): Cliente HTTP para comunicarse con el backend principal.

Estos servicios encapsulan lógica compleja y pueden ser reutilizados en múltiples rutas.

### 5.4 Patrón Adapter

El `BackendAPIClient` en el microservicio actúa como un adaptador que:

- Adapta las peticiones HTTP al backend principal a una interfaz más simple y orientada a objetos.
- Proporciona métodos como `get_partido()`, `get_equipo()`, `get_jugador()` que ocultan los detalles de las peticiones HTTP.

### 5.5 Patrón Singleton (Implícito)

Las extensiones de Flask (`db`, `jwt`, `cors`, `mail`) se inicializan una sola vez y se reutilizan en toda la aplicación, siguiendo un patrón similar al Singleton.

### 5.6 Patrón Decorator

El sistema utiliza extensivamente decoradores para:

- **Autenticación**: `@jwt_required()` valida que el usuario esté autenticado.
- **Autorización**: `@role_required(['admin'])` valida que el usuario tenga el rol requerido.
- **Rate Limiting**: `@rate_limit(max_requests=10, window_minutes=60)` limita el número de peticiones.
- **Sanitización**: `@sanitize_input({'nombre': 100})` sanitiza y valida la entrada.

Estos decoradores permiten aplicar funcionalidades transversales (cross-cutting concerns) de forma declarativa.

### 5.7 Patrón Factory

La función `create_app()` en `app/__init__.py` actúa como una factory que crea y configura la aplicación Flask según el entorno (development, production, testing).

## 6. Estructura del Backend

### 6.1 Organización de Carpetas

```
backend/
├── app/
│   ├── __init__.py              # Factory de la aplicación Flask
│   ├── config.py                # Configuraciones por entorno
│   ├── extensions.py            # Inicialización de extensiones (db, jwt, cors, mail)
│   ├── models/                  # Modelos de base de datos (ORM)
│   │   ├── usuario.py
│   │   ├── equipo.py
│   │   ├── jugador.py
│   │   ├── campeonato.py
│   │   ├── partido.py
│   │   └── ... (más modelos)
│   ├── routes/                  # Rutas/Controladores (endpoints REST)
│   │   ├── auth_routes.py
│   │   ├── equipo_routes.py
│   │   ├── jugador_routes.py
│   │   ├── campeonato_routes.py
│   │   ├── partido_routes.py
│   │   ├── alineaciones_proxy_routes.py  # Proxy al microservicio
│   │   └── ... (más rutas)
│   ├── middlewares/             # Middlewares personalizados
│   │   ├── auth_middleware.py   # Validación de roles
│   │   └── rate_limit_middleware.py  # Rate limiting
│   ├── security/                # Servicios de seguridad
│   │   ├── token_manager.py     # Gestión de tokens JWT
│   │   ├── email_service.py     # Envío de correos
│   │   ├── login_tracker.py     # Rastreo de logins
│   │   ├── rate_limiter.py      # Control de peticiones
│   │   └── security_logger.py   # Auditoría
│   ├── utils/                   # Utilidades
│   │   ├── error_handlers.py    # Manejo de errores
│   │   ├── sanitizer.py         # Sanitización de entrada
│   │   └── validators.py        # Validadores
│   ├── enums/                   # Enumeraciones
│   │   ├── campeonato_enums.py
│   │   ├── gol_enum.py
│   │   └── partido_enums.py
│   └── migrations/              # Migraciones de base de datos
├── run.py                       # Punto de entrada de la aplicación
├── requirements.txt             # Dependencias Python
└── uploads/                     # Archivos subidos (logos, fotos, documentos)
```

```
alineaciones-service/
├── app/
│   ├── __init__.py              # Factory de la aplicación Flask
│   ├── config.py                # Configuración del microservicio
│   ├── extensions.py            # Extensiones (db, jwt, cors)
│   ├── models/
│   │   └── alineacion.py        # Modelo de alineación
│   ├── routes/
│   │   └── alineacion_routes.py # Endpoints de alineaciones
│   └── services/
│       └── backend_api_client.py # Cliente HTTP al backend principal
├── run.py                       # Punto de entrada
└── requirements.txt             # Dependencias Python
```

### 6.2 Capas del Sistema

El backend principal está organizado en las siguientes capas:

#### 6.2.1 Capa de Presentación (Routes)

- **Responsabilidad**: Manejar peticiones HTTP, validar entrada, formatear respuestas.
- **Ubicación**: `app/routes/`
- **Tecnología**: Flask-RESTX con decoradores `@jwt_required()` y `@role_required()`.

#### 6.2.2 Capa de Lógica de Negocio (Services)

- **Responsabilidad**: Implementar la lógica de negocio compleja, validaciones de reglas de negocio.
- **Ubicación**: `app/security/` y servicios distribuidos en diferentes módulos.
- **Ejemplos**: `TokenManager`, `EmailService`, `LoginTracker`.

#### 6.2.3 Capa de Acceso a Datos (Models)

- **Responsabilidad**: Interactuar con la base de datos mediante SQLAlchemy ORM.
- **Ubicación**: `app/models/`
- **Tecnología**: Flask-SQLAlchemy con modelos que heredan de `db.Model`.

#### 6.2.4 Capa de Middleware

- **Responsabilidad**: Funcionalidades transversales como autenticación, autorización, rate limiting.
- **Ubicación**: `app/middlewares/`
- **Implementación**: Decoradores que se aplican a las rutas.

### 6.3 Responsabilidades de Cada Capa

**Capa de Presentación (Routes):**
- Recibir y parsear peticiones HTTP.
- Validar formato de datos de entrada.
- Llamar a servicios o modelos según corresponda.
- Formatear respuestas JSON.
- Manejar códigos de estado HTTP apropiados.

**Capa de Lógica de Negocio (Services):**
- Implementar reglas de negocio complejas.
- Coordinar múltiples operaciones de base de datos.
- Gestionar transacciones cuando es necesario.
- Validar condiciones de negocio (no solo formato de datos).

**Capa de Acceso a Datos (Models):**
- Definir estructura de datos (esquema de base de datos).
- Proporcionar métodos de consulta (query methods).
- Gestionar relaciones entre entidades.
- Convertir objetos a diccionarios para respuestas JSON (`to_dict()`).

**Capa de Middleware:**
- Interceptar peticiones antes de llegar a las rutas.
- Aplicar políticas de seguridad (autenticación, autorización).
- Controlar límites de peticiones.
- Registrar eventos de auditoría.

## 7. Comunicación entre Componentes

### 7.1 Backend Principal

El backend principal se comunica con:

- **Clientes (Frontend)**: Mediante API REST sobre HTTP/HTTPS. Los clientes envían peticiones con tokens JWT en el header `Authorization`.
- **Base de datos**: Mediante SQLAlchemy ORM que se conecta a MySQL mediante PyMySQL.
- **Microservicio de alineaciones**: Mediante peticiones HTTP utilizando la biblioteca `requests` cuando actúa como proxy.
- **Servidor de correo**: Mediante Flask-Mail que utiliza SMTP para enviar correos electrónicos.

### 7.2 Microservicio

El microservicio se comunica con:

- **Clientes (Frontend)**: Directamente mediante API REST cuando el cliente accede directamente al microservicio.
- **Backend Principal**: Mediante `BackendAPIClient` que realiza peticiones HTTP al backend principal para:
  - Validar que partidos, equipos y jugadores existen.
  - Obtener información adicional para enriquecer respuestas.
  - Verificar que los equipos participan en los partidos.
- **Base de datos propia**: Mediante SQLAlchemy ORM conectado a su propia base de datos MySQL (`alineaciones_db`).

### 7.3 Base de Datos

- **Backend Principal**: Se conecta a `gestion_campeonato` mediante PyMySQL.
- **Microservicio**: Se conecta a `alineaciones_db` mediante PyMySQL.

Ambas conexiones utilizan SQLAlchemy como capa de abstracción, lo que permite cambiar el motor de base de datos sin modificar el código de la aplicación.

### 7.4 Flujo de Datos Completo

#### Ejemplo 1: Cliente solicita alineaciones a través del backend principal

1. Cliente envía `GET /organizador/partidos/1/alineaciones` con token JWT.
2. Backend principal valida el token y verifica que el usuario es admin/superadmin.
3. Backend principal consulta la base de datos para obtener información del partido.
4. Backend principal realiza petición HTTP `GET http://localhost:5001/alineaciones?id_partido=1&id_equipo=X` al microservicio.
5. Microservicio valida el token JWT (compartido).
6. Microservicio consulta su base de datos para obtener alineaciones.
7. Microservicio realiza petición HTTP `GET http://localhost:5000/jugadores?id_equipo=X` al backend principal para enriquecer datos.
8. Backend principal retorna información de jugadores.
9. Microservicio combina datos y retorna respuesta al backend principal.
10. Backend principal combina información del partido con alineaciones y retorna al cliente.

#### Ejemplo 2: Líder define alineación directamente en microservicio

1. Cliente envía `POST /alineaciones/definir-alineacion` directamente al microservicio con token JWT.
2. Microservicio valida el token JWT.
3. Microservicio realiza petición `GET http://localhost:5000/partidos/1` al backend principal para validar el partido.
4. Backend principal retorna información del partido.
5. Microservicio valida que el equipo participa en el partido.
6. Microservicio realiza petición `GET http://localhost:5000/jugadores?id_equipo=X` para obtener jugadores.
7. Backend principal retorna lista de jugadores.
8. Microservicio valida que los jugadores pertenecen al equipo.
9. Microservicio guarda alineaciones en su base de datos.
10. Microservicio retorna respuesta al cliente.

## 8. Flujo General del Sistema

### 8.1 Autenticación y Autorización

1. **Registro de Usuario**:
   - Cliente envía `POST /auth/register` con datos del usuario.
   - Backend valida datos, hashea contraseña con bcrypt, crea usuario en BD.
   - Backend envía email de verificación.
   - Retorna mensaje de éxito.

2. **Login**:
   - Cliente envía `POST /auth/login` con email y contraseña.
   - Backend valida credenciales, verifica bloqueos de cuenta.
   - `TokenManager` genera access token (15 min) y refresh token (30 días).
   - Backend registra intento de login exitoso.
   - Retorna tokens al cliente.

3. **Peticiones Autenticadas**:
   - Cliente incluye token en header `Authorization: Bearer <token>`.
   - Middleware `@jwt_required()` valida token.
   - Si el token es válido, permite acceso a la ruta.
   - Si el token expiró, retorna 401 y el cliente debe usar refresh token.

4. **Refresh Token**:
   - Cliente detecta token expirado (401).
   - Cliente envía `POST /auth/refresh` con refresh token.
   - Backend valida refresh token en BD.
   - `TokenManager` genera nuevo access token.
   - Retorna nuevo access token al cliente.

### 8.2 Gestión de Campeonatos

1. **Creación de Campeonato**:
   - Admin envía `POST /campeonatos` con datos del campeonato.
   - Backend valida datos y crea registro en BD.
   - Retorna campeonato creado.

2. **Inscripción de Equipos**:
   - Líder envía `POST /inscripciones` con ID de equipo y código de campeonato.
   - Backend valida que el campeonato existe y acepta inscripciones.
   - Backend crea registro en `campeonato_equipo` con estado 'pendiente'.
   - Admin aprueba/rechaza mediante `PATCH /inscripciones/<id>`.

3. **Generación de Partidos**:
   - Admin envía `POST /campeonatos/<id>/generar-partidos` con parámetros.
   - Backend calcula combinaciones de equipos según tipo de competición.
   - Backend crea registros de partidos en BD.
   - Retorna lista de partidos generados.

### 8.3 Gestión de Partidos

1. **Inicio de Partido**:
   - Admin envía `PATCH /partidos/<id>` con estado 'en_juego'.
   - Backend valida que ambos equipos tienen alineación (consulta microservicio).
   - Backend actualiza estado del partido.
   - Backend crea registro en `historial_estado`.

2. **Registro de Eventos**:
   - Admin envía `POST /gol` o `POST /tarjetas` durante el partido.
   - Backend valida que el partido está 'en_juego'.
   - Backend crea registro de gol/tarjeta en BD.
   - Backend actualiza marcador del partido si corresponde.

3. **Finalización de Partido**:
   - Admin envía `PATCH /partidos/<id>` con estado 'finalizado' y resultado.
   - Backend valida resultado y lo marca como inmutable.
   - Backend actualiza estadísticas de equipos y jugadores.
   - Backend genera notificaciones a líderes de equipos.

### 8.4 Gestión de Alineaciones

1. **Definición de Alineación**:
   - Líder envía `POST /lider/alineaciones/definir` al backend principal (proxy).
   - Backend valida que el usuario es líder del equipo.
   - Backend valida que el partido existe y el equipo participa.
   - Backend reenvía petición al microservicio con token JWT.
   - Microservicio valida jugadores consultando backend principal.
   - Microservicio guarda alineación en su BD.
   - Microservicio retorna respuesta al backend.
   - Backend retorna respuesta al cliente.

2. **Consulta de Alineaciones**:
   - Cliente envía `GET /organizador/partidos/<id>/alineaciones`.
   - Backend consulta microservicio para ambos equipos.
   - Microservicio retorna alineaciones con datos enriquecidos.
   - Backend combina información y retorna al cliente.

3. **Cambios Durante el Partido**:
   - Líder envía `POST /lider/alineaciones/cambio` durante partido en juego.
   - Backend valida que el partido está 'en_juego'.
   - Backend reenvía al microservicio.
   - Microservicio actualiza `minuto_salida` del jugador que sale y `minuto_entrada` del que entra.
   - Retorna confirmación del cambio.

## 9. Ejecución del Backend y Microservicio

### 9.1 Backend Principal

**Requisitos previos:**
- Python 3.x instalado
- MySQL instalado y ejecutándose
- Base de datos `gestion_campeonato` creada
- Variables de entorno configuradas (opcional, puede usar valores por defecto)

**Instalación de dependencias:**
```bash
cd backend
pip install -r requirements.txt
```

**Configuración:**
- Crear archivo `.env` (opcional) con variables como:
  - `DATABASE_URL`: URL de conexión a MySQL
  - `JWT_SECRET_KEY`: Clave secreta para JWT
  - `MAIL_SERVER`, `MAIL_USERNAME`, `MAIL_PASSWORD`: Configuración de correo

**Ejecución:**
```bash
python run.py
```

El backend se ejecutará en `http://localhost:5000` por defecto.

**Configuración de puerto:**
El puerto se puede cambiar modificando `run.py`:
```python
app.run(host='0.0.0.0', port=5000, debug=True)
```

### 9.2 Microservicio

**Requisitos previos:**
- Python 3.x instalado
- MySQL instalado y ejecutándose
- Base de datos `alineaciones_db` creada
- Backend principal ejecutándose (para comunicación)

**Instalación de dependencias:**
```bash
cd alineaciones-service
pip install -r requirements.txt
```

**Configuración:**
- Editar `app/config.py` para configurar:
  - `SQLALCHEMY_DATABASE_URI`: Conexión a base de datos del microservicio
  - `JWT_SECRET_KEY`: Debe coincidir con el del backend principal
  - `BACKEND_API_URL`: URL del backend principal (`http://localhost:5000`)

**Ejecución:**
```bash
python run.py
```

El microservicio se ejecutará en `http://localhost:5001` por defecto.

### 9.3 Consideraciones Técnicas

**Orden de inicio:**
1. Iniciar MySQL
2. Iniciar backend principal (puerto 5000)
3. Iniciar microservicio (puerto 5001)

**Dependencias entre servicios:**
- El microservicio requiere que el backend principal esté ejecutándose para validaciones y consultas.
- El backend principal puede funcionar sin el microservicio, pero las funcionalidades de alineaciones no estarán disponibles.

**Variables de entorno:**
- Ambos servicios pueden usar archivos `.env` con `python-dotenv`.
- El backend principal carga variables de entorno en `run.py` con `load_dotenv()`.

**Modo debug:**
- Ambos servicios se ejecutan con `debug=True` por defecto en desarrollo.
- En producción, cambiar a `debug=False` y usar un servidor WSGI como Gunicorn.

**CORS:**
- El backend principal está configurado para aceptar peticiones desde `http://localhost:4200` y `http://localhost:3000`.
- Para otros orígenes, modificar la configuración en `app/__init__.py`.

## 10. Conclusión Técnica

### 10.1 Resumen del Backend

El backend del sistema de gestión de campeonatos está construido sobre Flask, utilizando una arquitectura híbrida que combina un backend monolítico principal con un microservicio especializado. Esta arquitectura permite:

- **Separación de responsabilidades**: El backend principal gestiona la lógica de negocio central, mientras que el microservicio se enfoca exclusivamente en alineaciones.
- **Escalabilidad independiente**: Cada componente puede escalarse según sus necesidades específicas.
- **Mantenibilidad**: La separación facilita el mantenimiento y actualización de funcionalidades.

El sistema implementa seguridad robusta mediante JWT, rate limiting, bloqueo de cuentas y auditoría completa. La comunicación entre componentes se realiza mediante HTTP REST, manteniendo un acoplamiento bajo y permitiendo la evolución independiente de cada servicio.

### 10.2 Ventajas de la Arquitectura Utilizada

1. **Arquitectura Cliente-Servidor**:
   - Separación clara entre cliente y servidor.
   - Facilita el desarrollo de múltiples clientes (web, móvil).
   - Permite escalar el servidor independientemente de los clientes.

2. **Microservicio de Alineaciones**:
   - Permite escalar la funcionalidad de alineaciones independientemente.
   - Facilita el mantenimiento y actualización de esta funcionalidad específica.
   - Base de datos especializada optimizada para alineaciones.

3. **Uso de ORM (SQLAlchemy)**:
   - Abstracción de la base de datos facilita cambios de motor.
   - Código más limpio y mantenible.
   - Gestión automática de relaciones entre entidades.

4. **Autenticación JWT**:
   - Stateless: no requiere sesiones en el servidor.
   - Escalable: tokens pueden validarse sin consultar base de datos.
   - Seguro: tokens firmados y con expiración.

5. **Patrones de Diseño**:
   - MVC facilita la organización del código.
   - Servicios encapsulan lógica compleja reutilizable.
   - Decoradores permiten funcionalidades transversales declarativas.

### 10.3 Escalabilidad y Mantenibilidad

**Escalabilidad:**

- **Horizontal**: Ambos servicios pueden ejecutarse en múltiples instancias detrás de un balanceador de carga.
- **Vertical**: Cada servicio puede escalarse independientemente según la carga.
- **Base de datos**: MySQL permite replicación y sharding si es necesario.

**Mantenibilidad:**

- **Código organizado**: Estructura clara de carpetas y separación de responsabilidades.
- **Documentación**: Endpoints documentados automáticamente con Swagger/OpenAPI.
- **Testing**: Estructura permite agregar tests unitarios e integración fácilmente.
- **Migraciones**: Flask-Migrate permite gestionar cambios de esquema de forma controlada.

**Extensibilidad:**

- **Nuevos endpoints**: Agregar nuevas rutas es sencillo siguiendo el patrón existente.
- **Nuevos modelos**: Agregar nuevas entidades sigue el patrón de modelos SQLAlchemy.
- **Nuevos microservicios**: La arquitectura permite agregar más microservicios siguiendo el patrón del de alineaciones.

El sistema está diseñado para crecer y evolucionar manteniendo la calidad del código y la separación de responsabilidades, facilitando el trabajo en equipo y el mantenimiento a largo plazo.
