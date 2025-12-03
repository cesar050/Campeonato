# Práctica 006 - Prototipo UI/UX con Stitch

## Descripción del Flujo

Este prototipo implementa el **flujo completo de autenticación y gestión de roles** en el sistema Campeonato Libre. El flujo cubre desde el primer contacto del usuario con el sistema (landing page), pasando por registro y autenticación con funcionalidades de recuperación de cuenta, hasta los dashboards diferenciados según el rol del usuario (SuperAdmin u Organizador).

**Flujo de navegación:**
```
Landing Page → Registro/Login → Dashboard (según rol)
                    ↓
        Recuperar Password / Desbloquear Cuenta
                    ↓
    SuperAdmin Dashboard → Crear Organizador
    Organizador Dashboard → Gestión de Torneos
```

Este flujo es la base de seguridad del sistema y permite demostrar manejo de formularios, validaciones, navegación condicional por roles y dashboards administrativos.

---

## Pantallas del Prototipo

### 1. Página Principal del Sistema

**Archivo:** `index.html`

**Propósito:**  
Pantalla de entrada que presenta "Campeonato Libre" a usuarios no autenticados. Muestra las funcionalidades principales y proporciona acceso a registro e inicio de sesión.

**Componentes principales:**
- Header con logo "Campeonato Libre"
- Hero section con título y descripción del sistema
- Botones CTA: "Iniciar Sesión" (azul) y "Registrarse" (verde)
- Grid de 3 tarjetas: "Gestión de Torneos", "Control de Equipos", "Resultados en Tiempo Real"
- Sección de beneficios con lista de características
- Footer con enlaces (términos, privacidad, contacto)

**Capturas:**

![Página Principal - Desktop](img/01-landing-desktop.png)


### 2. Registro de Usuario

**Archivo:** `registro.html`

**Propósito:**  
Permite que nuevos usuarios se registren en el sistema. Captura información básica y crea una cuenta nueva con validaciones de seguridad.

**Componentes principales:**
- Formulario centrado tipo card
- Campos:
  - Nombre completo (text, required)
  - Email (email, required)
  - Contraseña (password con indicador de fortaleza, required)
  - Confirmar contraseña (password, required)
- Checkbox "Acepto términos y condiciones" con link
- Botón "Registrarse" (verde destacado)
- Link: "¿Ya tienes cuenta? Inicia sesión"

**Capturas:**

![Registro - Desktop](img/02-registro-desktop.png)

---

### 3. Inicio de Sesión

**Archivo:** `login.html`

**Propósito:**  
Permite la autenticación de usuarios registrados mediante credenciales. Valida y redirige al dashboard correspondiente según el rol.

**Componentes principales:**
- Formulario centrado tipo card
- Campos:
  - Email (email, required)
  - Contraseña (password con ícono mostrar/ocultar, required)
- Checkbox "Recordarme"
- Botón "Iniciar Sesión" (azul destacado)
- Links:
  - "¿Olvidaste tu contraseña?"
  - "Crear cuenta nueva"

**Capturas:**

![Login - Desktop](img/03-login-desktop.png)

---

### 4. Recuperación de Contraseña

**Archivo:** `recuperar-password.html`

**Propósito:**  
Permite a usuarios que olvidaron su contraseña iniciar el proceso de recuperación mediante email. Envía un enlace temporal de restablecimiento.

**Componentes principales:**
- Ícono de email (ilustración)
- Título "Recuperar Contraseña"
- Texto explicativo del proceso
- Campo: Email (email, required)
- Mensaje informativo: "El enlace es válido por 1 hora"
- Botón "Enviar enlace de recuperación"
- Link "Volver al inicio de sesión"

**Capturas:**

![Recuperar Password - Desktop](img//04-recuperar-desktop.png)

---

### 5. Desbloquear Cuenta

**Archivo:** `desbloquear-cuenta.html`

**Propósito:**  
Permite a usuarios con cuentas bloqueadas (por múltiples intentos fallidos) solicitar desbloqueo mediante verificación por email. Implementa seguridad contra ataques de fuerza bruta.

**Componentes principales:**
- Ícono de candado (ilustración de cuenta bloqueada)
- Título "Cuenta Bloqueada"
- Mensaje explicativo sobre el bloqueo
- Información: "Tiempo restante de bloqueo: 30 minutos"
- Campo: Email (email, required)
- Botón "Solicitar desbloqueo por email"
- Links: "Volver al inicio de sesión" y "Contactar al administrador"

**Capturas:**

![Desbloquear Cuenta - Desktop](img/05-desbloquear-desktop.png)

---

### 6. Dashboard de SuperAdmin

**Archivo:** `dashboard-superadmin.html`

**Propósito:**  
Panel de control principal para usuarios con rol SuperAdmin. Proporciona acceso completo a funcionalidades administrativas: gestión de organizadores, monitoreo de torneos, configuración global.

**Componentes principales:**
- Header con navegación horizontal y menú de usuario
- Sidebar izquierdo con menú:
  - Dashboard (activo)
  - Organizadores
  - Torneos
  - Usuarios
  - Configuración
- Grid de 4 cards con estadísticas:
  - Total Organizadores: 12
  - Total Torneos: 45
  - Usuarios Activos: 234
  - Equipos Registrados: 156
- Sección "Acciones Rápidas":
  - Botón "Crear Organizador"
  - Botón "Ver Reportes"
  - Botón "Configurar Sistema"
- Tabla "Actividad Reciente" (5 filas de ejemplo)

**Capturas:**

![Dashboard SuperAdmin - Desktop](img/06-dashboard-superadmin-desktop.png)

---

### 7. Crear Organizador

**Archivo:** `crear-organizador.html`

**Propósito:**  
Formulario para que el SuperAdmin cree nuevos usuarios con rol "Organizador". Captura información completa y asigna permisos específicos.

**Componentes principales:**
- Header y Sidebar de SuperAdmin
- Breadcrumb: Inicio > Organizadores > Crear Nuevo
- Formulario con 3 fieldsets:
  
  **1. Información Personal:**
  - Nombre (text, required)
  - Apellido (text, required)
  - Teléfono (tel, required)
  
  **2. Credenciales de Acceso:**
  - Email (email, required)
  - Contraseña temporal (password con botón "Generar automática")
  
  **3. Permisos:**
  - Checkbox: Crear torneos
  - Checkbox: Gestionar equipos
  - Checkbox: Aprobar inscripciones

- Área de upload: "Foto de perfil (opcional)"
- Botones: "Crear Organizador" (verde) y "Cancelar" (gris)

**Capturas:**

![Crear Organizador - Desktop](img/07-crear-organizador-desktop.png)

---

### 8. Dashboard de Organizador

**Archivo:** `dashboard-organizador.html`

**Propósito:**  
Panel de control para usuarios con rol Organizador. Proporciona acceso a funcionalidades de gestión de torneos: crear/editar torneos, gestionar equipos, registrar resultados.

**Componentes principales:**
- Header con navegación horizontal y menú de usuario
- Sidebar izquierdo con menú:
  - Dashboard (activo)
  - Mis Torneos
  - Equipos
  - Resultados
  - Mi Perfil
- Grid de 3 cards con métricas:
  - Torneos Activos: 3
  - Equipos en mis Torneos: 24
  - Partidos Hoy: 5
- Sección "Mis Torneos":
  - Botón "Crear Nuevo Torneo"
  - 3 cards de torneos con estado y número de equipos
- Sección "Próximos Partidos" (calendario o lista)
- Sección "Notificaciones":
  - "2 equipos pendientes de aprobación"
  - "3 resultados por registrar"

**Capturas:**

![Dashboard Organizador - Desktop](img//08-dashboard-organizador-desktop.png)

---

## Aspectos Técnicos Implementados

### HTML Semántico
- Uso de `<header>`, `<nav>`, `<main>`, `<section>`, `<article>`, `<aside>`, `<footer>`
- Formularios con `<fieldset>` y `<legend>`
- Labels asociados a inputs mediante `for` e `id`

### Diseño Responsivo
- **Flexbox:** Navegación, centrado de formularios, distribución de cards
- **CSS Grid:** Grid de estadísticas (4 → 2 → 1 columnas según viewport)
- **Media Queries:** Breakpoints en 768px (tablet) y 1024px (desktop)
- **Sidebar colapsable:** Menú hamburguesa en móvil, sidebar fijo en desktop

### Accesibilidad
- Contraste mínimo 4.5:1 entre texto y fondo
- Tamaños de fuente legibles (mínimo 16px)
- Áreas clicables de 44x44px (touch-friendly)
- Indicadores de foco visibles para navegación por teclado
- Jerarquía correcta de encabezados (h1-h6)

---

## Estructura del Repositorio

```
docs/
├── ui_prototipo_stitch.md    # Documentación completa
├── ui_prototipo_stitch.md                  # Este archivo
└── img/
    ├── desktop/               # Capturas desktop (8 imágenes)
    │   ├── 01-landing-desktop.png
    │   ├── 02-registro-desktop.png
    │   ├── 03-login-desktop.png
    │   ├── 04-recuperar-desktop.png
    │   ├── 05-desbloquear-desktop.png
    │   ├── 06-dashboard-superadmin-desktop.png
    │   ├── 07-crear-organizador-desktop.png
    │   └── 08-dashboard-organizador-desktop.png
    │

```
