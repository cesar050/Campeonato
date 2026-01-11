-- Migración: Cambiar enum de tema (claro/oscuro/auto) a colores
-- Fecha: 2026-01-08
-- Descripción: Actualiza el enum tema_enum para usar colores en lugar de temas claro/oscuro
-- Versión: Compatible con safe update mode de MySQL

-- Paso 1: Deshabilitar safe update mode temporalmente (solo para esta sesión)
SET SQL_SAFE_UPDATES = 0;

-- Paso 2: Actualizar los valores existentes en la tabla
-- Convertir 'claro' -> 'verde' (por defecto)
-- Convertir 'oscuro' -> 'verde' (por defecto)
-- Convertir 'auto' -> 'verde' (por defecto)
UPDATE preferencias_usuario 
SET tema = 'verde' 
WHERE tema IN ('claro', 'oscuro', 'auto');

-- Paso 3: Modificar el enum para aceptar solo los nuevos colores
ALTER TABLE preferencias_usuario 
MODIFY COLUMN tema ENUM('verde', 'azul', 'rojo', 'purpura', 'naranja', 'cyan', 'rosa', 'amarillo') 
DEFAULT 'verde';

-- Paso 4: Rehabilitar safe update mode
SET SQL_SAFE_UPDATES = 1;

-- Paso 5: Verificar que todos los valores se actualizaron correctamente
SELECT tema, COUNT(*) as cantidad 
FROM preferencias_usuario 
GROUP BY tema;

