-- Migración: Agregar columna color_primario y restaurar tema a claro/oscuro/auto
-- Fecha: 2026-01-08
-- Descripción: Separa tema (claro/oscuro) de color_primario (colores de acento)

-- Paso 1: Agregar columna color_primario
ALTER TABLE preferencias_usuario 
ADD COLUMN color_primario ENUM('verde', 'azul', 'rojo', 'purpura', 'naranja', 'cyan', 'rosa', 'amarillo') 
DEFAULT 'verde' 
AFTER tema;

-- Paso 2: Migrar datos existentes
-- Si tema tiene un color, moverlo a color_primario y establecer tema a 'claro'
UPDATE preferencias_usuario 
SET color_primario = tema,
    tema = 'claro'
WHERE id > 0 
  AND tema IN ('verde', 'azul', 'rojo', 'purpura', 'naranja', 'cyan', 'rosa', 'amarillo');

-- Paso 3: Restaurar enum de tema a claro/oscuro/auto
ALTER TABLE preferencias_usuario 
MODIFY COLUMN tema ENUM('claro', 'oscuro', 'auto') 
DEFAULT 'claro';

-- Paso 4: Asegurar que todos tengan color_primario
UPDATE preferencias_usuario 
SET color_primario = 'verde'
WHERE id > 0 AND (color_primario IS NULL OR color_primario = '');

-- Verificar resultados
SELECT tema, color_primario, COUNT(*) as cantidad 
FROM preferencias_usuario 
GROUP BY tema, color_primario;

