# Sistema de Gestión de Campeonatos

**Práctica APE 005** - Simulación de peticiones HTTP

---
## Documentacion de Peticiones HTTP

### Tabla de Resultados

| Metodo | URL | Codigo de Estado | Tiempo Respuesta | Observaciones CORS |
|--------|-----|------------------|------------------|-------------------|
| POST | /auth/login | 200 OK | ~150ms | Access-Control-Allow-Origin: http://localhost:4200 |
| POST | /auth/register | 201 Created | ~200ms | CORS habilitado, solo acepta Gmail |
| GET | /auth/me | 200 OK | ~50ms | Requiere header Authorization: Bearer token |
| POST | /auth/logout | 200 OK | ~30ms | Revoca token JWT |
| OPTIONS | /auth/login | 200 OK | ~10ms | Preflight request para CORS |

### Request Headers
```
POST /auth/login HTTP/1.1
Host: localhost:5000
Content-Type: application/json
Origin: http://localhost:4200
Accept: application/json
```

### Response Headers
```
HTTP/1.1 200 OK
Content-Type: application/json
Access-Control-Allow-Origin: http://localhost:4200
Access-Control-Allow-Credentials: true
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```

## Requisitos

- Python 3.10+
- Node.js 18+

---

## Instalación (5 minutos)

### 1. Clonar repositorio
```bash
git clone https://github.com/cesar050/Campeonato.git
cd Campeonato
git checkout feature/http-client
```

### 2. Backend
```bash
cd backend
python -m venv venv

# Activar entorno virtual
source venv/bin/activate        # Linux/Mac
# venv\Scripts\activate         # Windows

pip install -r requirements.txt

# Usar SQLite (NO necesita MySQL)
export USE_SQLITE=true          # Linux/Mac
# set USE_SQLITE=true           # Windows

python run.py
```

Backend en: http://localhost:5000

### 3. Frontend (abrir otra terminal)
```bash
cd Campeonato/frontend
npm install
npx ng serve
```

Frontend en: http://localhost:4200

---

## Probar la aplicación

1. Abrir http://localhost:4200
2. Clic en **"Regístrate aquí"**
3. Crear cuenta (usar correo `@gmail.com`)
4. Iniciar sesión
5. Ver el Dashboard

---

## Peticiones HTTP

| Método | Endpoint | Código | Descripción |
|--------|----------|--------|-------------|
| POST | `/auth/register` | 201 | Registrar usuario |
| POST | `/auth/login` | 200 | Iniciar sesión |
| GET | `/auth/me` | 200 | Usuario actual |
| POST | `/auth/logout` | 200 | Cerrar sesión |

---

## Ver peticiones en el navegador

1. Abrir DevTools (F12)
2. Ir a pestaña **Network/Red**
3. Hacer login
4. Ver la petición `login` con código **200**
