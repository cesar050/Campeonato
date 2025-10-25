# 🗄️ Base de Datos - Gestión de Campeonatos Barriales

## �� Archivos

- **campeonato.sql** - Base de datos completa (17 tablas)
- **migrations/** - Migraciones incrementales

## 🚀 Instalación
```bash
mysql -u root -p < database/campeonato.sql
```

## 📊 Tablas del Sistema

### Core (10 tablas)
- usuarios, equipos, jugadores, campeonatos, partidos
- goles, tarjetas, alineaciones, notificaciones, solicitudes_equipo

### Seguridad (7 tablas) 🔒
- token_blacklist - Tokens revocados
- refresh_tokens - Tokens de actualización
- login_attempts - Intentos de login
- account_lockouts - Bloqueos temporales
- security_logs - Auditoría
- rate_limits - Control de peticiones
- password_reset_tokens - Recuperación de contraseña

## 🔐 Características de Seguridad

✅ Bloqueo tras 5 intentos fallidos (10 minutos)
✅ Código de desbloqueo de 6 dígitos enviado por email
✅ Refresh tokens para sesiones seguras
✅ Auditoría completa de eventos
✅ Rate limiting por IP/usuario
✅ Recuperación de contraseña con código

## 📝 Última actualización
$(date +"%Y-%m-%d %H:%M:%S")
