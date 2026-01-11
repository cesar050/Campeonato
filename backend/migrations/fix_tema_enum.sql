-- Script para corregir valores inválidos en la columna tema
-- Este script migra valores de color antiguos a tema='claro' y color_primario

-- Paso 1: Si tema tiene un valor de color (antiguo), moverlo a color_primario y poner tema='claro'
UPDATE preferencias_usuario 
SET tema = 'claro',
    color_primario = CASE 
        WHEN tema = 'verde' THEN 'verde'
        WHEN tema = 'azul' THEN 'azul'
        WHEN tema = 'rojo' THEN 'rojo'
        WHEN tema = 'purpura' THEN 'purpura'
        WHEN tema = 'naranja' THEN 'naranja'
        WHEN tema = 'cyan' THEN 'cyan'
        WHEN tema = 'rosa' THEN 'rosa'
        WHEN tema = 'amarillo' THEN 'amarillo'
        ELSE COALESCE(color_primario, 'verde')
    END
WHERE tema IN ('verde', 'azul', 'rojo', 'purpura', 'naranja', 'cyan', 'rosa', 'amarillo');

-- Paso 2: Si tema tiene cualquier otro valor inválido, ponerlo a 'claro'
UPDATE preferencias_usuario 
SET tema = 'claro'
WHERE tema NOT IN ('claro', 'oscuro', 'auto');

-- Paso 3: Asegurar que color_primario tenga un valor válido
UPDATE preferencias_usuario 
SET color_primario = 'verde'
WHERE color_primario IS NULL 
   OR color_primario NOT IN ('verde', 'azul', 'rojo', 'purpura', 'naranja', 'cyan', 'rosa', 'amarillo');

