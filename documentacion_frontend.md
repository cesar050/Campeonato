# Documentación Técnica del Frontend - Sistema de Gestión de Campeonatos

## 1. Introducción

El sistema de gestión de campeonatos cuenta con dos aplicaciones frontend que proporcionan interfaces de usuario para interactuar con el backend: una aplicación web desarrollada con Angular y una aplicación móvil desarrollada con React Native. Ambas aplicaciones se comunican directamente con el backend mediante peticiones HTTP REST, utilizando autenticación basada en tokens JWT.

El frontend web (Angular) está diseñado para ser una Single Page Application (SPA) que ofrece funcionalidades completas para diferentes roles de usuario: superadministradores, organizadores y líderes de equipo. La aplicación móvil (React Native) proporciona una experiencia optimizada para dispositivos móviles, enfocada principalmente en la visualización de información pública de campeonatos y partidos.

Ambas aplicaciones frontend actúan como clientes del backend, consumiendo los endpoints REST expuestos por el servidor Flask y el microservicio de alineaciones, proporcionando una capa de presentación moderna y responsiva para el sistema completo.

## 2. Tecnologías Utilizadas

### 2.1 Frontend Web (Angular)

#### Lenguaje de Programación
- **TypeScript 5.9.2**: Lenguaje principal utilizado para el desarrollo del frontend web. TypeScript proporciona tipado estático y características avanzadas de JavaScript ES2022.

#### Framework Principal
- **Angular 21.0.0**: Framework de desarrollo web moderno basado en componentes. Utiliza arquitectura de componentes standalone, signals reactivos y programación funcional.

#### Librerías y Dependencias Principales
- **@angular/common 21.0.0**: Módulo común de Angular con directivas, pipes y utilidades.
- **@angular/core 21.0.0**: Núcleo del framework Angular con decoradores, inyección de dependencias y signals.
- **@angular/router 21.0.0**: Sistema de enrutamiento para navegación entre vistas.
- **@angular/forms 21.0.0**: Módulo para manejo de formularios reactivos y validación.
- **@angular/material 21.0.2**: Componentes de Material Design para la interfaz de usuario.
- **@angular/cdk 21.0.2**: Component Dev Kit con utilidades y componentes base.
- **rxjs 7.8.0**: Biblioteca para programación reactiva mediante Observables.

#### Herramientas de Desarrollo
- **@angular/cli 21.0.0**: Herramienta de línea de comandos para desarrollo, construcción y despliegue.
- **@angular/build 21.0.0**: Sistema de construcción moderno basado en Vite/ESBuild.
- **TypeScript 5.9.2**: Compilador de TypeScript con configuración estricta.

#### Gestor de Paquetes
- **npm 10.9.3**: Node Package Manager utilizado para gestionar dependencias del proyecto.

#### Estilos y Diseño
- **SCSS**: Preprocesador CSS utilizado para estilos modulares y variables.
- **Tailwind CSS**: Framework CSS utility-first utilizado mediante CDN para estilos rápidos.
- **Google Material Symbols**: Iconografía de Material Design.

### 2.2 Aplicación Móvil (React Native)

#### Lenguaje de Programación
- **TypeScript 5.8.3**: Lenguaje utilizado para el desarrollo de la aplicación móvil.

#### Framework Principal
- **React Native 0.83.1**: Framework para desarrollo de aplicaciones móviles multiplataforma (iOS y Android).
- **React 19.2.0**: Biblioteca JavaScript para construcción de interfaces de usuario.

#### Librerías Principales
- **axios 1.13.2**: Cliente HTTP para realizar peticiones al backend.
- **@react-native-async-storage/async-storage 2.2.0**: Almacenamiento local persistente.
- **@react-native-community/voice 1.1.9**: Integración de reconocimiento de voz.
- **react-native-maps 1.26.20**: Componentes de mapas para React Native.
- **react-native-geolocation-service 5.3.1**: Servicios de geolocalización.
- **react-native-vector-icons 10.3.0**: Iconografía vectorial.

#### Herramientas de Desarrollo
- **Metro Bundler**: Empaquetador de JavaScript para React Native.
- **Babel**: Transpilador de JavaScript/TypeScript.
- **Jest 29.6.3**: Framework de testing.

### 2.3 Comunicación HTTP

#### Frontend Web
- **HttpClient de Angular**: Cliente HTTP integrado en Angular para realizar peticiones REST al backend.
- **Interceptores HTTP**: Mecanismo para interceptar y modificar peticiones HTTP (autenticación, manejo de errores).

#### Aplicación Móvil
- **axios**: Cliente HTTP independiente para realizar peticiones REST al backend.

## 3. Arquitectura del Frontend

### 3.1 Frontend Web (Angular)

El frontend web implementa una arquitectura basada en componentes standalone, siguiendo el patrón de Single Page Application (SPA). La arquitectura se organiza en capas claramente definidas:

#### Arquitectura por Capas

1. **Capa de Presentación (Components)**: Componentes Angular que representan la interfaz de usuario.
2. **Capa de Lógica de Negocio (Services)**: Servicios inyectables que encapsulan la lógica de comunicación con el backend.
3. **Capa de Enrutamiento (Routes)**: Configuración de rutas y navegación entre vistas.
4. **Capa de Seguridad (Guards e Interceptors)**: Protección de rutas y manejo de autenticación.
5. **Capa de Modelos (Models)**: Interfaces TypeScript que definen la estructura de datos.

#### Flujo de Datos

El flujo de datos sigue un patrón unidireccional:

1. **Usuario → Componente**: El usuario interactúa con la interfaz (clicks, formularios).
2. **Componente → Servicio**: El componente llama a métodos del servicio correspondiente.
3. **Servicio → Backend**: El servicio realiza peticiones HTTP al backend mediante HttpClient.
4. **Backend → Servicio**: El backend responde con datos JSON.
5. **Servicio → Componente**: El servicio procesa la respuesta y la devuelve al componente.
6. **Componente → Vista**: El componente actualiza la vista con los nuevos datos.

#### Signals Reactivos

Angular 21 utiliza signals para manejo reactivo del estado:

- **Signals**: Valores reactivos que notifican cambios a los consumidores.
- **Computed Signals**: Signals derivados que se actualizan automáticamente cuando cambian sus dependencias.
- **Effect**: Efectos secundarios que se ejecutan cuando cambian los signals.

### 3.2 Aplicación Móvil (React Native)

La aplicación móvil implementa una arquitectura basada en componentes funcionales de React, utilizando hooks para manejo de estado y efectos secundarios:

#### Arquitectura por Módulos

1. **Screens**: Pantallas principales de la aplicación.
2. **Components**: Componentes reutilizables de UI.
3. **Services**: Servicios para comunicación con el backend y lógica de negocio.
4. **Navigation**: Configuración de navegación entre pantallas.
5. **Utils**: Utilidades y constantes compartidas.

#### Flujo de Datos

El flujo de datos en la aplicación móvil sigue un patrón similar al frontend web:

1. **Usuario → Screen/Component**: Interacción del usuario.
2. **Screen/Component → Service**: Llamada a servicios mediante hooks.
3. **Service → Backend**: Peticiones HTTP con axios.
4. **Backend → Service**: Respuesta JSON.
5. **Service → Screen/Component**: Actualización del estado.
6. **Screen/Component → Vista**: Renderizado actualizado.

## 4. Estructura del Frontend

### 4.1 Estructura del Frontend Web (Angular)

La estructura del proyecto Angular se organiza de la siguiente manera:

```
frontend/
├── src/
│   ├── app/
│   │   ├── core/                    # Módulo core con funcionalidades compartidas
│   │   │   ├── guards/              # Guards de autenticación y autorización
│   │   │   │   ├── auth.guard.ts
│   │   │   │   ├── lider.guard.ts
│   │   │   │   └── organizador.guard.ts
│   │   │   ├── interceptors/        # Interceptores HTTP
│   │   │   │   └── auth.interceptor.ts
│   │   │   ├── models/              # Modelos e interfaces TypeScript
│   │   │   │   └── usuario.model.ts
│   │   │   ├── services/            # Servicios core
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── perfil.service.ts
│   │   │   │   └── accessibility.service.ts
│   │   │   ├── directives/          # Directivas personalizadas
│   │   │   └── pipes/               # Pipes personalizados
│   │   ├── features/                # Módulos de funcionalidades por rol
│   │   │   ├── auth/                # Módulo de autenticación
│   │   │   │   └── components/
│   │   │   │       ├── login/
│   │   │   │       ├── register/
│   │   │   │       ├── forgot-password/
│   │   │   │       ├── unlock-account/
│   │   │   │       └── verify-email/
│   │   │   ├── organizador/          # Módulo de organizador
│   │   │   │   ├── components/
│   │   │   │   ├── services/
│   │   │   │   │   └── organizador.service.ts
│   │   │   │   └── organizador.component.ts
│   │   │   ├── lider-equipo/        # Módulo de líder de equipo
│   │   │   │   ├── components/
│   │   │   │   ├── services/
│   │   │   │   │   ├── lider-equipo.service.ts
│   │   │   │   │   └── formaciones.service.ts
│   │   │   │   ├── models/
│   │   │   │   │   └── lider-equipo.models.ts
│   │   │   │   └── lider-equipo.component.ts
│   │   │   ├── superadmin/           # Módulo de superadministrador
│   │   │   │   ├── components/
│   │   │   │   ├── services/
│   │   │   │   │   └── superadmin.service.ts
│   │   │   │   └── superadmin.component.ts
│   │   │   ├── perfil/              # Módulo de perfil de usuario
│   │   │   ├── landing/             # Página de inicio pública
│   │   │   ├── bienvenido/          # Página de bienvenida
│   │   │   ├── sobre-nosotros/      # Página informativa
│   │   │   └── precios/             # Página de precios
│   │   ├── layouts/                 # Layouts de la aplicación
│   │   │   ├── auth-layout/         # Layout para páginas de autenticación
│   │   │   └── main-layout/         # Layout principal de la aplicación
│   │   ├── shared/                  # Componentes y utilidades compartidas
│   │   │   ├── components/          # Componentes reutilizables
│   │   │   ├── directives/          # Directivas compartidas
│   │   │   └── pipes/               # Pipes compartidos
│   │   ├── app.config.ts            # Configuración de la aplicación
│   │   ├── app.routes.ts            # Configuración de rutas
│   │   ├── app.ts                   # Componente raíz
│   │   └── app.html                 # Template del componente raíz
│   ├── assets/                      # Recursos estáticos
│   │   └── images/                  # Imágenes
│   ├── environments/                # Configuración de entornos
│   │   ├── environment.ts           # Entorno de desarrollo
│   │   └── environment.prod.ts     # Entorno de producción
│   ├── styles.scss                  # Estilos globales
│   ├── index.html                   # HTML principal
│   └── main.ts                      # Punto de entrada de la aplicación
├── angular.json                     # Configuración de Angular CLI
├── package.json                     # Dependencias y scripts
├── tsconfig.json                    # Configuración de TypeScript
└── README.md                        # Documentación del proyecto
```

#### Responsabilidades por Módulo

**Core Module:**
- **Guards**: Protección de rutas basada en autenticación y roles.
- **Interceptors**: Interceptación de peticiones HTTP para agregar tokens y manejar errores.
- **Services**: Servicios fundamentales como autenticación y perfil de usuario.
- **Models**: Interfaces TypeScript compartidas.

**Features Modules:**
- **auth**: Gestión de autenticación (login, registro, recuperación de contraseña).
- **organizador**: Funcionalidades para organizadores de campeonatos.
- **lider-equipo**: Funcionalidades para líderes de equipos.
- **superadmin**: Funcionalidades administrativas del sistema.
- **perfil**: Gestión del perfil de usuario.

**Shared Module:**
- Componentes, directivas y pipes reutilizables en toda la aplicación.

**Layouts:**
- Estructuras de diseño comunes para diferentes secciones de la aplicación.

### 4.2 Estructura de la Aplicación Móvil (React Native)

La estructura del proyecto React Native se organiza de la siguiente manera:

```
CampeonatoMovil/
├── src/
│   ├── screens/                     # Pantallas principales
│   │   ├── HomeScreen.tsx
│   │   ├── CampeonatoDetailScreen.tsx
│   │   ├── PartidoDetailScreen.tsx
│   │   └── ...
│   ├── components/                  # Componentes reutilizables
│   │   ├── CampeonatoCard.tsx
│   │   ├── PartidoCard.tsx
│   │   ├── Header.tsx
│   │   └── ...
│   ├── services/                    # Servicios de comunicación
│   │   ├── api.ts                   # Cliente HTTP y servicios API
│   │   └── favoritesService.ts      # Servicio de favoritos local
│   ├── navigation/                  # Configuración de navegación
│   │   └── TabNavigator.tsx
│   ├── utils/                       # Utilidades
│   │   ├── constants.ts             # Constantes y configuración
│   │   ├── voiceCommandProcessor.ts
│   │   └── voiceDiagnostics.ts
│   ├── theme/                       # Tema y estilos
│   │   ├── colors.ts
│   │   └── spacing.ts
│   └── types/                       # Tipos TypeScript
│       └── index.ts
├── android/                         # Código nativo Android
├── ios/                             # Código nativo iOS
├── App.tsx                          # Componente raíz
├── package.json                     # Dependencias
├── tsconfig.json                    # Configuración TypeScript
└── README.md                        # Documentación
```

## 5. Comunicación con el Backend

### 5.1 Configuración de URLs del Backend

#### Frontend Web (Angular)

La comunicación con el backend se configura mediante archivos de entorno que definen la URL base de la API:

**Entorno de Desarrollo (`environment.ts`):**
```typescript
export const environment = {
  production: false,
  apiUrl: 'http://localhost:5000',
  tokenKey: 'access_token',
  refreshTokenKey: 'refresh_token',
  userKey: 'current_user'
};
```

**Entorno de Producción (`environment.prod.ts`):**
```typescript
export const environment = {
  production: true,
  apiUrl: 'https://e9ed52b9025b.ngrok-free.app',
  tokenKey: 'access_token',
  refreshTokenKey: 'refresh_token',
  userKey: 'current_user'
};
```

#### Aplicación Móvil (React Native)

La configuración de la URL del backend se realiza mediante una función que detecta la plataforma y el entorno:

```typescript
const getBaseURL = () => {
  if (__DEV__) {
    if (Platform.OS === 'android') {
      return `http://127.0.0.1:5000`;
    } else if (Platform.OS === 'ios') {
      return `http://localhost:5000`;
    }
  }
  return 'https://tu-api-produccion.com';
};
```

### 5.2 Cliente HTTP

#### Frontend Web

El frontend web utiliza `HttpClient` de Angular, configurado globalmente en `app.config.ts`:

```typescript
export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideHttpClient(withInterceptors([authInterceptor]))
  ]
};
```

Los servicios utilizan `HttpClient` inyectado para realizar peticiones:

```typescript
@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private readonly API_URL = `${environment.apiUrl}/auth`;
  
  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.API_URL}/login`, credentials);
  }
}
```

#### Aplicación Móvil

La aplicación móvil utiliza `axios` como cliente HTTP, configurado en `src/services/api.ts`:

```typescript
import axios from 'axios';
import { API_BASE_URL } from '../utils/constants';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});
```

### 5.3 Endpoints Consumidos

#### Endpoints de Autenticación

- `POST /auth/register`: Registro de nuevos usuarios
- `POST /auth/login`: Inicio de sesión
- `POST /auth/logout`: Cierre de sesión
- `POST /auth/refresh`: Renovación de token de acceso
- `GET /auth/me`: Obtener información del usuario actual
- `POST /auth/unlock`: Desbloquear cuenta bloqueada
- `POST /auth/resend-verification`: Reenviar email de verificación

#### Endpoints de Organizador

- `GET /campeonatos/mis-campeonatos`: Obtener campeonatos del organizador
- `POST /campeonatos`: Crear nuevo campeonato
- `PUT /campeonatos/{id}`: Actualizar campeonato
- `GET /campeonatos/{id}/inscripciones`: Obtener inscripciones de un campeonato
- `POST /campeonatos/{id}/generar-partidos`: Generar partidos del campeonato
- `GET /equipos`: Obtener lista de equipos
- `GET /partidos`: Obtener lista de partidos
- `PATCH /partidos/{id}/estado`: Cambiar estado de un partido
- `POST /partidos/{id}/finalizar`: Finalizar un partido
- `GET /organizador/partidos/{id}/alineaciones`: Obtener alineaciones de un partido

#### Endpoints de Líder de Equipo

- `GET /lider/mis-equipos`: Obtener equipos del líder
- `POST /equipos`: Crear nuevo equipo
- `GET /jugadores`: Obtener jugadores de un equipo
- `POST /jugadores`: Crear nuevo jugador
- `GET /lider/partidos`: Obtener partidos del equipo
- `POST /lider/alineaciones/definir`: Definir alineación de un partido
- `GET /campeonatos/publicos`: Obtener campeonatos públicos disponibles
- `POST /campeonatos/{id}/inscripciones`: Inscribir equipo en campeonato

#### Endpoints de Perfil

- `GET /perfil`: Obtener perfil del usuario
- `PUT /perfil`: Actualizar perfil
- `POST /perfil/foto`: Subir foto de perfil
- `GET /perfil/preferencias`: Obtener preferencias del usuario
- `PUT /perfil/preferencias`: Actualizar preferencias

### 5.4 Manejo de Respuestas y Errores

#### Frontend Web

El manejo de errores se realiza mediante:

1. **Interceptores HTTP**: El `authInterceptor` maneja errores 401 (no autorizado) y realiza refresh automático del token.

2. **Operadores RxJS**: Los servicios utilizan operadores como `catchError` y `throwError` para manejar errores:

```typescript
login(credentials: LoginRequest): Observable<LoginResponse> {
  return this.http.post<LoginResponse>(`${this.API_URL}/login`, credentials).pipe(
    tap(response => {
      this.storeTokens(response.access_token, response.refresh_token);
      this.storeUser(response.usuario);
    }),
    catchError(error => {
      this.isLoadingSignal.set(false);
      return this.handleError(error);
    })
  );
}
```

3. **Manejo en Componentes**: Los componentes suscriben a los observables y manejan errores en el callback:

```typescript
this.authService.login(loginData).subscribe({
  next: (response) => {
    // Manejo de éxito
  },
  error: (error) => {
    // Manejo de error
    this.errorMessage.set(error.mensaje || 'Error al iniciar sesión');
  }
});
```

#### Aplicación Móvil

El manejo de errores se realiza mediante interceptores de axios:

```typescript
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    console.error('API Error:', error.message);
    return Promise.reject(error);
  }
);
```

## 6. Uso del Proxy

### 6.1 Configuración del Proxy

**Análisis realizado**: Tras una revisión exhaustiva del código del frontend, se ha determinado que **NO existe configuración de proxy** en el proyecto Angular.

No se encontraron archivos de configuración de proxy como:
- `proxy.conf.json`
- `proxy.conf.js`
- Configuración de proxy en `angular.json`

### 6.2 Comunicación Directa con el Backend

El frontend se comunica **directamente** con el backend utilizando las URLs configuradas en los archivos de entorno:

#### Desarrollo Local

En desarrollo, el frontend Angular se ejecuta en `http://localhost:4200` y se comunica directamente con el backend en `http://localhost:5000`:

```typescript
// environment.ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:5000'
};
```

#### Producción

En producción, el frontend se comunica con el backend mediante una URL externa (en el ejemplo, una URL de ngrok):

```typescript
// environment.prod.ts
export const environment = {
  production: true,
  apiUrl: 'https://e9ed52b9025b.ngrok-free.app'
};
```

### 6.3 Implicaciones de la Ausencia de Proxy

#### Ventajas de la Comunicación Directa

1. **Simplicidad**: No requiere configuración adicional de proxy.
2. **Flexibilidad**: Permite cambiar fácilmente la URL del backend mediante variables de entorno.
3. **Claridad**: La comunicación es explícita y fácil de rastrear.

#### Consideraciones Técnicas

1. **CORS (Cross-Origin Resource Sharing)**: El backend debe estar configurado para permitir peticiones desde el origen del frontend mediante Flask-CORS.

2. **Desarrollo Local**: En desarrollo local, ambos servidores (frontend y backend) deben estar ejecutándose simultáneamente en diferentes puertos.

3. **Producción**: En producción, el frontend y el backend pueden estar en diferentes dominios, requiriendo configuración CORS adecuada en el backend.

### 6.4 Alternativa: Proxy de Desarrollo (No Implementado)

Si se deseara implementar un proxy de desarrollo en Angular, se podría crear un archivo `proxy.conf.json`:

```json
{
  "/api/*": {
    "target": "http://localhost:5000",
    "secure": false,
    "changeOrigin": true,
    "logLevel": "debug"
  }
}
```

Y configurarlo en `angular.json`:

```json
"serve": {
  "builder": "@angular/build:dev-server",
  "options": {
    "proxyConfig": "proxy.conf.json"
  }
}
```

Sin embargo, esta configuración **no está implementada** en el proyecto actual.

### 6.5 Manejo de CORS

Dado que no existe proxy, el backend debe manejar CORS correctamente. El backend Flask utiliza `Flask-CORS` para permitir peticiones desde el frontend:

- El frontend realiza peticiones desde `http://localhost:4200` (desarrollo) o desde el dominio de producción.
- El backend debe configurar CORS para permitir estos orígenes.
- Las peticiones incluyen headers de autenticación (Bearer tokens) que también deben ser permitidos por CORS.

## 7. Flujo de Interacción del Usuario

### 7.1 Flujo de Autenticación

1. **Usuario accede a la página de login** (`/auth/login`).

2. **Usuario ingresa credenciales** y hace clic en "Iniciar Sesión".

3. **Componente LoginComponent** captura los datos del formulario y llama a `AuthService.login()`.

4. **AuthService** realiza petición HTTP POST a `/auth/login` con las credenciales.

5. **Backend valida credenciales** y responde con:
   - `access_token`: Token JWT de acceso
   - `refresh_token`: Token para renovar el acceso
   - `usuario`: Información del usuario

6. **AuthService almacena tokens** en `localStorage`:
   - `access_token`
   - `refresh_token`
   - `current_user`

7. **AuthService actualiza signals**:
   - `currentUserSignal.set(usuario)`
   - `isAuthenticatedSignal.set(true)`

8. **Componente redirige** al usuario según su rol:
   - Superadmin → `/superadmin/dashboard`
   - Admin (Organizador) → `/organizador/dashboard`
   - Líder → `/lider-equipo/dashboard`

### 7.2 Flujo de Petición Autenticada

1. **Usuario realiza acción** que requiere datos del backend (ej: ver lista de campeonatos).

2. **Componente llama al servicio** correspondiente (ej: `OrganizadorService.obtenerMisCampeonatos()`).

3. **Servicio construye URL** usando `environment.apiUrl` + endpoint.

4. **Interceptor HTTP (`authInterceptor`)** intercepta la petición:
   - Verifica si la ruta es pública.
   - Si no es pública, obtiene el `access_token` de `localStorage`.
   - Agrega header `Authorization: Bearer {token}` a la petición.

5. **HttpClient envía petición** al backend con el token en el header.

6. **Backend valida token** y procesa la petición.

7. **Backend responde** con datos JSON.

8. **Interceptor recibe respuesta**:
   - Si es exitosa (200-299), la pasa al componente.
   - Si es 401 (no autorizado), intenta renovar el token automáticamente.

9. **Servicio procesa respuesta** y devuelve datos tipados al componente.

10. **Componente actualiza vista** con los datos recibidos.

### 7.3 Flujo de Renovación Automática de Token

1. **Interceptor detecta error 401** en una petición autenticada.

2. **Interceptor llama a `AuthService.refreshToken()`**.

3. **AuthService** realiza petición POST a `/auth/refresh` con el `refresh_token`.

4. **Backend valida refresh_token** y responde con nuevo `access_token`.

5. **AuthService almacena nuevo token** en `localStorage`.

6. **Interceptor reintenta petición original** con el nuevo token.

7. **Si el refresh falla**, el interceptor llama a `AuthService.forceLogout()` y redirige al login.

## 8. Seguridad en el Frontend

### 8.1 Autenticación

#### Almacenamiento de Tokens

Los tokens JWT se almacenan en `localStorage` del navegador:

```typescript
private storeTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem(environment.tokenKey, accessToken);
  localStorage.setItem(environment.refreshTokenKey, refreshToken);
}
```

**Consideraciones de Seguridad:**

1. **localStorage vs sessionStorage**: Se utiliza `localStorage` para persistir la sesión entre pestañas y recargas de página. Esto implica que los tokens persisten hasta que se eliminen explícitamente.

2. **Vulnerabilidad XSS**: `localStorage` es vulnerable a ataques XSS. Si el código JavaScript malicioso se ejecuta en la aplicación, puede acceder a los tokens almacenados.

3. **Mitigación**: El frontend debe asegurar que no haya vulnerabilidades XSS mediante:
   - Sanitización de inputs del usuario.
   - Uso de Content Security Policy (CSP).
   - Validación de datos antes de renderizar.

#### Validación de Tokens

El frontend valida tokens JWT decodificando el payload y verificando la expiración:

```typescript
hasValidToken(): boolean {
  const token = this.getAccessToken();
  if (!token) return false;
  
  // Verificar formato JWT (3 partes separadas por puntos)
  if (!token.includes('.') || token.split('.').length !== 3) {
    return false;
  }
  
  // Decodificar payload y verificar expiración
  const payload = JSON.parse(atob(token.split('.')[1]));
  const expiry = payload.exp * 1000;
  return Date.now() < expiry;
}
```

### 8.2 Autorización

#### Guards de Rutas

El frontend utiliza guards para proteger rutas según el rol del usuario:

**authGuard**: Verifica que el usuario esté autenticado y tenga un token válido.

```typescript
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  
  if (authService.isAuthenticated() && authService.hasValidToken()) {
    return true;
  }
  
  router.navigate(['/auth/login'], {
    queryParams: { returnUrl: state.url }
  });
  return false;
};
```

**superadminGuard**: Verifica que el usuario tenga rol de superadministrador.

**organizadorGuard**: Verifica que el usuario tenga rol de organizador (admin).

**liderGuard**: Verifica que el usuario tenga rol de líder de equipo.

#### Interceptor de Autenticación

El interceptor HTTP agrega automáticamente el token de autenticación a todas las peticiones (excepto rutas públicas):

```typescript
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  
  const publicRoutes = ['/auth/login', '/auth/register', '/auth/verify-email', '/auth/unlock', '/auth/refresh'];
  const isPublicRoute = publicRoutes.some(route => req.url.includes(route));
  
  if (isPublicRoute) {
    return next(req);
  }
  
  const token = authService.getAccessToken();
  if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }
  
  return next(req);
};
```

### 8.3 Manejo de Errores de Seguridad

#### Errores 401 (No Autorizado)

Cuando el backend responde con 401, el interceptor intenta renovar el token automáticamente:

```typescript
catchError((error: HttpErrorResponse) => {
  if (error.status === 401 && !req.url.includes('/auth/refresh')) {
    return handleTokenExpired(req, next, authService);
  }
  return throwError(() => error);
})
```

#### Logout Forzado

Si la renovación del token falla, se fuerza el logout y se redirige al login:

```typescript
forceLogout(): void {
  this.clearSession();
  this.router.navigate(['/auth/login']);
}
```

### 8.4 Buenas Prácticas Observadas

1. **Validación de Tokens**: El frontend valida tokens antes de considerarlos válidos.
2. **Renovación Automática**: Implementación de renovación automática de tokens expirados.
3. **Protección de Rutas**: Uso de guards para proteger rutas según roles.
4. **Interceptores HTTP**: Centralización de la lógica de autenticación en interceptores.
5. **Manejo de Errores**: Manejo adecuado de errores de autenticación y autorización.

## 9. Ejecución del Frontend

### 9.1 Frontend Web (Angular)

#### Requisitos Previos

- **Node.js**: Versión compatible con npm 10.9.3
- **npm**: Gestor de paquetes Node.js

#### Instalación de Dependencias

```bash
cd frontend
npm install
```

#### Desarrollo

Para ejecutar el servidor de desarrollo:

```bash
npm start
# o
ng serve
```

El servidor se ejecuta en `http://localhost:4200` por defecto (configurado en `angular.json`).

**Configuración del servidor de desarrollo:**

```json
"serve": {
  "builder": "@angular/build:dev-server",
  "options": {
    "host": "0.0.0.0",
    "port": 4200,
    "allowedHosts": ["all"]
  }
}
```

#### Construcción para Producción

Para construir la aplicación para producción:

```bash
npm run build
# o
ng build
```

La aplicación se construye en la carpeta `dist/gestion-campeonato-frontend/browser/`.

**Configuración de producción:**

- Optimización activada
- Source maps deshabilitados (o habilitados según configuración)
- Output hashing activado para cache busting

#### Variables de Entorno

Las variables de entorno se configuran en:
- `src/environments/environment.ts` (desarrollo)
- `src/environments/environment.prod.ts` (producción)

**Variables principales:**

- `apiUrl`: URL base del backend
- `tokenKey`: Clave para almacenar el access token
- `refreshTokenKey`: Clave para almacenar el refresh token
- `userKey`: Clave para almacenar información del usuario

### 9.2 Aplicación Móvil (React Native)

#### Requisitos Previos

- **Node.js**: Versión >= 20
- **npm** o **yarn**: Gestor de paquetes
- **Android Studio** (para Android)
- **Xcode** (para iOS, solo en macOS)

#### Instalación de Dependencias

```bash
cd CampeonatoMovil
npm install
```

#### Desarrollo

**Android:**

```bash
npm run android
# o
react-native run-android
```

**iOS:**

```bash
npm run ios
# o
react-native run-ios
```

**Metro Bundler:**

Para iniciar solo el bundler de JavaScript:

```bash
npm start
# o
react-native start
```

#### Configuración de URLs

La URL del backend se configura en `src/utils/constants.ts`:

- **Android**: `http://127.0.0.1:5000` (requiere `adb reverse tcp:5000 tcp:5000`)
- **iOS Simulator**: `http://localhost:5000`
- **iOS Dispositivo Físico**: `http://{LOCAL_IP}:5000`

#### Construcción para Producción

**Android:**

```bash
cd android
./gradlew assembleRelease
```

**iOS:**

Abrir el proyecto en Xcode y construir desde ahí.

## 10. Conclusión Técnica

### 10.1 Resumen del Frontend

El sistema de gestión de campeonatos cuenta con dos aplicaciones frontend bien estructuradas:

1. **Frontend Web (Angular)**: Aplicación SPA moderna que proporciona una interfaz completa para todos los roles del sistema. Utiliza arquitectura basada en componentes standalone, signals reactivos, y comunicación HTTP directa con el backend.

2. **Aplicación Móvil (React Native)**: Aplicación móvil multiplataforma que ofrece una experiencia optimizada para dispositivos móviles, enfocada en visualización de información pública y funcionalidades básicas.

Ambas aplicaciones se comunican directamente con el backend mediante peticiones HTTP REST, utilizando autenticación basada en tokens JWT. No existe configuración de proxy en el proyecto; la comunicación es directa mediante URLs configuradas en archivos de entorno.

### 10.2 Ventajas de la Arquitectura Utilizada

#### Frontend Web (Angular)

1. **Componentes Standalone**: Facilita la modularidad y la carga perezosa de componentes.
2. **Signals Reactivos**: Proporciona un sistema de reactividad eficiente y predecible.
3. **TypeScript**: Tipado estático que mejora la mantenibilidad y reduce errores.
4. **Arquitectura por Capas**: Separación clara de responsabilidades (componentes, servicios, guards, interceptores).
5. **Lazy Loading**: Carga perezosa de módulos de funcionalidades para optimizar el rendimiento inicial.
6. **Interceptores HTTP**: Centralización de lógica de autenticación y manejo de errores.

#### Aplicación Móvil (React Native)

1. **Multiplataforma**: Un solo código base para iOS y Android.
2. **Componentes Nativos**: Acceso a componentes nativos de cada plataforma.
3. **Performance**: Rendimiento cercano al nativo mediante optimizaciones del framework.

### 10.3 Mantenibilidad y Escalabilidad

#### Mantenibilidad

1. **Código Organizado**: Estructura de carpetas clara y lógica por funcionalidades.
2. **Tipado Fuerte**: TypeScript proporciona documentación implícita y detección temprana de errores.
3. **Servicios Centralizados**: Lógica de comunicación con el backend centralizada en servicios.
4. **Componentes Reutilizables**: Componentes compartidos en el módulo `shared`.

#### Escalabilidad

1. **Lazy Loading**: Permite agregar nuevas funcionalidades sin afectar el bundle inicial.
2. **Arquitectura Modular**: Facilita la adición de nuevos módulos de funcionalidades.
3. **Separación de Responsabilidades**: Cada módulo es independiente y puede evolucionar por separado.
4. **Configuración por Entornos**: Fácil adaptación a diferentes entornos (desarrollo, producción).

### 10.4 Consideraciones Técnicas

#### Comunicación con el Backend

- **Sin Proxy**: La comunicación directa requiere configuración CORS adecuada en el backend.
- **URLs Configurables**: Las URLs del backend se configuran mediante archivos de entorno, facilitando el despliegue en diferentes entornos.

#### Seguridad

- **Tokens en localStorage**: Los tokens se almacenan en `localStorage`, lo que requiere medidas de seguridad adicionales contra XSS.
- **Validación de Tokens**: El frontend valida tokens antes de utilizarlos.
- **Renovación Automática**: Implementación de renovación automática de tokens expirados.

#### Rendimiento

- **Lazy Loading**: Carga perezosa de módulos para optimizar el tiempo de carga inicial.
- **Signals Reactivos**: Sistema de reactividad eficiente que minimiza re-renderizados innecesarios.
- **Optimización de Producción**: Build de producción optimizado con minificación y tree-shaking.

### 10.5 Recomendaciones para Mejoras Futuras

1. **Implementar Proxy de Desarrollo**: Considerar implementar un proxy de desarrollo para simplificar la configuración CORS en desarrollo local.

2. **Mejorar Seguridad de Tokens**: Considerar alternativas a `localStorage` para almacenamiento de tokens (ej: httpOnly cookies gestionadas por el backend).

3. **Implementar Service Workers**: Agregar service workers para funcionalidades offline y mejor rendimiento.

4. **Testing**: Implementar tests unitarios y de integración para componentes y servicios críticos.

5. **Documentación de API**: Generar documentación automática de los servicios y endpoints consumidos.

6. **Manejo de Estado Global**: Considerar implementar un sistema de manejo de estado global (ej: NgRx) para aplicaciones más complejas.

7. **Optimización de Imágenes**: Implementar lazy loading de imágenes y optimización de assets.

---

**Documento generado mediante análisis exhaustivo del código fuente del proyecto.**
