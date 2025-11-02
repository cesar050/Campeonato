from flask import Blueprint, request, jsonify
from app.extensions import db
from sqlalchemy import text

estadisticas_bp = Blueprint('estadisticas', __name__)

@estadisticas_bp.route('/tabla-posiciones', methods=['GET'])
def tabla_posiciones():
    """
    Obtiene la tabla de posiciones usando la vista SQL
    
    Query params:
        id_campeonato (opcional): Filtrar por campeonato
    
    Returns:
        200: Tabla de posiciones ordenada por puntos
    """
    try:
        id_campeonato = request.args.get('id_campeonato')
        
        # Consulta base usando la vista
        query = """
            SELECT 
                vtp.*,
                e.logo_url
            FROM vista_tabla_posiciones vtp
            LEFT JOIN equipos e ON vtp.id_equipo = e.id_equipo
        """
        
        # Si se especifica campeonato, filtrar partidos de ese campeonato
        if id_campeonato:
            query = """
                SELECT 
                    e.id_equipo,
                    e.nombre AS equipo,
                    e.logo_url,
                    COUNT(DISTINCT p.id_partido) AS partidos_jugados,
                    SUM(CASE 
                        WHEN (p.id_equipo_local = e.id_equipo AND p.goles_local > p.goles_visitante) OR
                             (p.id_equipo_visitante = e.id_equipo AND p.goles_visitante > p.goles_local)
                        THEN 1 ELSE 0 END) AS ganados,
                    SUM(CASE 
                        WHEN p.goles_local = p.goles_visitante AND p.estado = 'finalizado'
                        THEN 1 ELSE 0 END) AS empatados,
                    SUM(CASE 
                        WHEN (p.id_equipo_local = e.id_equipo AND p.goles_local < p.goles_visitante) OR
                             (p.id_equipo_visitante = e.id_equipo AND p.goles_visitante < p.goles_local)
                        THEN 1 ELSE 0 END) AS perdidos,
                    SUM(CASE 
                        WHEN p.id_equipo_local = e.id_equipo THEN p.goles_local
                        WHEN p.id_equipo_visitante = e.id_equipo THEN p.goles_visitante
                        ELSE 0 END) AS goles_favor,
                    SUM(CASE 
                        WHEN p.id_equipo_local = e.id_equipo THEN p.goles_visitante
                        WHEN p.id_equipo_visitante = e.id_equipo THEN p.goles_local
                        ELSE 0 END) AS goles_contra,
                    (SUM(CASE 
                        WHEN p.id_equipo_local = e.id_equipo THEN p.goles_local
                        WHEN p.id_equipo_visitante = e.id_equipo THEN p.goles_visitante
                        ELSE 0 END) - 
                     SUM(CASE 
                        WHEN p.id_equipo_local = e.id_equipo THEN p.goles_visitante
                        WHEN p.id_equipo_visitante = e.id_equipo THEN p.goles_local
                        ELSE 0 END)) AS diferencia_goles,
                    (SUM(CASE 
                        WHEN (p.id_equipo_local = e.id_equipo AND p.goles_local > p.goles_visitante) OR
                             (p.id_equipo_visitante = e.id_equipo AND p.goles_visitante > p.goles_local)
                        THEN 3
                        WHEN p.goles_local = p.goles_visitante AND p.estado = 'finalizado'
                        THEN 1 
                        ELSE 0 END)) AS puntos
                FROM equipos e
                LEFT JOIN partidos p ON (e.id_equipo = p.id_equipo_local OR e.id_equipo = p.id_equipo_visitante)
                    AND p.estado = 'finalizado'
                    AND p.id_campeonato = :id_campeonato
                WHERE e.estado = 'aprobado'
                GROUP BY e.id_equipo, e.nombre, e.logo_url
                ORDER BY puntos DESC, diferencia_goles DESC, goles_favor DESC
            """
            result = db.session.execute(text(query), {'id_campeonato': int(id_campeonato)})
        else:
            result = db.session.execute(text(query))
        
        # Convertir resultado a lista de diccionarios
        columns = result.keys()
        tabla = [dict(zip(columns, row)) for row in result.fetchall()]
        
        # Agregar posición
        for idx, equipo in enumerate(tabla, start=1):
            equipo['posicion'] = idx
        
        return jsonify({
            'tabla_posiciones': tabla,
            'total_equipos': len(tabla)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@estadisticas_bp.route('/goleadores', methods=['GET'])
def obtener_goleadores():
    """
    Obtiene tabla de goleadores
    
    Query params:
        id_campeonato (opcional): Filtrar por campeonato
        limit (opcional): Cantidad de goleadores (default: 10)
    
    Returns:
        200: Tabla de goleadores
    """
    try:
        id_campeonato = request.args.get('id_campeonato')
        limit = int(request.args.get('limit', 10))
        
        if id_campeonato:
            query = """
                SELECT 
                    j.id_jugador,
                    j.nombre,
                    j.apellido,
                    j.dorsal,
                    e.nombre AS equipo,
                    e.logo_url AS equipo_logo,
                    COUNT(g.id_gol) AS total_goles,
                    SUM(CASE WHEN g.tipo = 'penal' THEN 1 ELSE 0 END) AS penales,
                    SUM(CASE WHEN g.tipo = 'tiro_libre' THEN 1 ELSE 0 END) AS tiros_libres
                FROM jugadores j
                INNER JOIN equipos e ON j.id_equipo = e.id_equipo
                LEFT JOIN goles g ON j.id_jugador = g.id_jugador AND g.tipo != 'autogol'
                LEFT JOIN partidos p ON g.id_partido = p.id_partido
                WHERE p.id_campeonato = :id_campeonato AND p.estado = 'finalizado'
                GROUP BY j.id_jugador, j.nombre, j.apellido, j.dorsal, e.nombre, e.logo_url
                HAVING total_goles > 0
                ORDER BY total_goles DESC, j.apellido
                LIMIT :limit
            """
            result = db.session.execute(
                text(query), 
                {'id_campeonato': int(id_campeonato), 'limit': limit}
            )
        else:
            query = """
                SELECT 
                    j.id_jugador,
                    j.nombre,
                    j.apellido,
                    j.dorsal,
                    e.nombre AS equipo,
                    e.logo_url AS equipo_logo,
                    COUNT(g.id_gol) AS total_goles,
                    SUM(CASE WHEN g.tipo = 'penal' THEN 1 ELSE 0 END) AS penales,
                    SUM(CASE WHEN g.tipo = 'tiro_libre' THEN 1 ELSE 0 END) AS tiros_libres
                FROM jugadores j
                INNER JOIN equipos e ON j.id_equipo = e.id_equipo
                LEFT JOIN goles g ON j.id_jugador = g.id_jugador AND g.tipo != 'autogol'
                GROUP BY j.id_jugador, j.nombre, j.apellido, j.dorsal, e.nombre, e.logo_url
                HAVING total_goles > 0
                ORDER BY total_goles DESC, j.apellido
                LIMIT :limit
            """
            result = db.session.execute(text(query), {'limit': limit})
        
        columns = result.keys()
        goleadores = [dict(zip(columns, row)) for row in result.fetchall()]
        
        # Agregar posición
        for idx, goleador in enumerate(goleadores, start=1):
            goleador['posicion'] = idx
        
        return jsonify({
            'goleadores': goleadores,
            'total': len(goleadores)
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500