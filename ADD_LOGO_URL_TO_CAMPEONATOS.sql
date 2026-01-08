-- Script para agregar el campo logo_url a la tabla campeonatos
-- Ejecuta este script en tu base de datos MySQL

USE gestion_campeonato;

-- Agregar columna logo_url si no existe
ALTER TABLE campeonatos 
ADD COLUMN IF NOT EXISTS logo_url VARCHAR(255) NULL AFTER es_publico;

-- Verificar que se agregó correctamente
DESCRIBE campeonatos;

SELECT 'Campo logo_url agregado exitosamente a la tabla campeonatos' AS mensaje;

