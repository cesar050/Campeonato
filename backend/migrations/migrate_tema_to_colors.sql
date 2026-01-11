-- Migración: Cambiar enum de tema (claro/oscuro/auto) a colores
-- Fecha: 2026-01-08
-- Descripción: Actualiza el enum tema_enum para usar colores en lugar de temas claro/oscuro

-- Paso 1: Actualizar los valores existentes en la tabla
-- Convertir 'claro' -> 'verde' (por defecto)
-- Convertir 'oscuro' -> 'verde' (por defecto)
-- Convertir 'auto' -> 'verde' (por defecto)
-- Nota: Usamos id (columna KEY) para evitar el error de safe update mode
UPDATE preferencias_usuario 
SET tema = 'verde' 
WHERE id > 0 AND tema IN ('claro', 'oscuro', 'auto');

-- Paso 2: Eliminar el enum antiguo (si existe)
-- Nota: En MySQL/MariaDB, no se puede eliminar un enum directamente
-- Necesitamos recrear la columna

-- Paso 3: Crear el nuevo enum con los colores
-- Primero, crear el nuevo tipo enum (si no existe)
-- Nota: Esto puede variar según el SGBD (PostgreSQL vs MySQL/MariaDB)

-- Para PostgreSQL:
-- DROP TYPE IF EXISTS tema_enum CASCADE;
-- CREATE TYPE tema_enum AS ENUM ('verde', 'azul', 'rojo', 'purpura', 'naranja', 'cyan', 'rosa', 'amarillo');
-- ALTER TABLE preferencias_usuario ALTER COLUMN tema TYPE tema_enum USING tema::text::tema_enum;

-- Para MySQL/MariaDB (que es lo que parece estar usando el proyecto):
-- Necesitamos alterar la columna directamente
ALTER TABLE preferencias_usuario 
MODIFY COLUMN tema ENUM('verde', 'azul', 'rojo', 'purpura', 'naranja', 'cyan', 'rosa', 'amarillo') 
DEFAULT 'verde';

-- Verificar que todos los valores se actualizaron correctamente
SELECT tema, COUNT(*) as cantidad 
FROM preferencias_usuario 
GROUP BY tema;

