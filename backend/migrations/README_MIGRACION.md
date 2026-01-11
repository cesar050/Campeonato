# Migración: Cambio de Tema a Colores

## Problema
El enum `tema_enum` en la tabla `preferencias_usuario` tenía valores antiguos (`'claro'`, `'oscuro'`, `'auto'`) que ahora se han cambiado a colores (`'verde'`, `'azul'`, `'rojo'`, etc.).

## Solución

### Opción 1: Ejecutar migración SQL manualmente (RECOMENDADO)

**Si usas MySQL Workbench o un cliente SQL con safe update mode:**

Ejecuta el script que deshabilita temporalmente el safe update mode:

```bash
mysql -u root -p gestion_campeonato < backend/migrations/migrate_tema_to_colors_safe.sql
```

O ejecuta los comandos SQL directamente en tu cliente:

```sql
-- Deshabilitar safe update mode temporalmente
SET SQL_SAFE_UPDATES = 0;

-- Actualizar valores antiguos a 'verde'
UPDATE preferencias_usuario 
SET tema = 'verde' 
WHERE tema IN ('claro', 'oscuro', 'auto');

-- Modificar el enum
ALTER TABLE preferencias_usuario 
MODIFY COLUMN tema ENUM('verde', 'azul', 'rojo', 'purpura', 'naranja', 'cyan', 'rosa', 'amarillo') 
DEFAULT 'verde';

-- Rehabilitar safe update mode
SET SQL_SAFE_UPDATES = 1;
```

**Si prefieres no deshabilitar safe update mode**, usa esta versión que incluye una columna KEY:

```sql
-- Actualizar usando id (columna KEY)
UPDATE preferencias_usuario 
SET tema = 'verde' 
WHERE id > 0 AND tema IN ('claro', 'oscuro', 'auto');

-- Modificar el enum
ALTER TABLE preferencias_usuario 
MODIFY COLUMN tema ENUM('verde', 'azul', 'rojo', 'purpura', 'naranja', 'cyan', 'rosa', 'amarillo') 
DEFAULT 'verde';
```

### Opción 2: El backend migra automáticamente

El código del backend ahora incluye migración automática que convierte valores antiguos a 'verde' cuando se accede a las preferencias. Sin embargo, **es recomendable ejecutar la migración SQL** para actualizar el enum en la base de datos.

## Verificación

Después de ejecutar la migración, verifica que todos los valores se actualizaron:

```sql
SELECT tema, COUNT(*) as cantidad 
FROM preferencias_usuario 
GROUP BY tema;
```

Todos los registros deberían tener `tema = 'verde'` o uno de los nuevos colores.

