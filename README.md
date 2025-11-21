# Sistema de Gestión de Campeonatos

**Práctica APE 005** - Simulación de peticiones HTTP

---

## Instalación Rápida (5 minutos)

### 1. Clonar
```bash
git clone https://github.com/cesar050/Campeonato.git
cd Campeonato
git checkout feature/http-client
```

### 2. Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate    # Linux/Mac
# venv\Scripts\activate     # Windows
pip install -r requirements.txt

# Usar SQLite (no necesita MySQL)
export USE_SQLITE=true      # Linux/Mac
# set USE_SQLITE=true       # Windows

python run.py
```

Backend corriendo en: http://localhost:5000

### 3. Frontend (otra terminal)
```bash
cd frontend
npm install
ng serve
```

Frontend corriendo en: http://localhost:4200

---

## Probar

1. Abrir http://localhost:4200
2. Clic en "Regístrate aquí"
3. Crear cuenta (usar correo @gmail.com)
4. Iniciar sesión
5. Ver Dashboard

---

## Peticiones HTTP Documentadas

| Método | Endpoint | Código | Descripción |
|--------|----------|--------|-------------|
| POST | `/auth/register` | 201 | Registrar usuario |
| POST | `/auth/login` | 200 | Iniciar sesión |
| GET | `/auth/me` | 200 | Obtener usuario actual |
| POST | `/auth/logout` | 200 | Cerrar sesión |

---

## Evidencias

Ver pestaña **Network** en DevTools (F12) para observar:
- Request Headers
- Response Headers
- Códigos de estado
- Tiempos de respuesta

---
