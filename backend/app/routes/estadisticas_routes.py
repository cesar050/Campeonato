from flask import request
from flask_restx import Namespace, fields, Resource
from app.extensions import db
from sqlalchemy import text

estadisticas_ns = Namespace('estadisticas', description='Estadísticas y reportes del campeonato')

# ============================================
# MODELOS PARA DOCUMENTACIÓN SWAGGER
# ============================================

posicion_model = estadisticas_ns.model('Posicion', {
    'posicion': fields.Integer(description='Posición en la tabla'),
    'id_equipo': fields.Integer(description='ID del equipo'),
    'equipo': fields.String(description='Nombre del equipo'),
    'logo_url': fields.String(description='URL del logo'),
    'partidos_jugados': fields.Integer(description='Partidos jugados'),
    'ganados': fields.Integer(description='Partidos ganados'),
    'empatados': fields.Integer(description='Partidos empatados'),
    'perdidos': fields.Integer(description='Partidos perdidos'),
    'goles_favor': fields.Integer(description='Goles a favor'),
    'goles_contra': fields.Integer(description='Goles en contra'),
    'diferencia_goles': fields.Integer(description='Diferencia de goles'),
    'puntos': fields.Integer(description='Puntos totales')
})

goleador_model = estadisticas_ns.model('Goleador', {
    'posicion': fields.Integer(description='Posición en la tabla'),
    'id_jugador': fields.Integer(description='ID del jugador'),
    'nombre': fields.String(description='Nombre completo'),
    'dorsal': fields.Integer(description='Número de dorsal'),
    'equipo': fields.String(description='Nombre del equipo'),
    'equipo_logo': fields.String(description='Logo del equipo'),
    'total_goles': fields.Integer(description='Total de goles'),
    'penales': fields.Integer(description='Goles de penal'),
    'tiros_libres': fields.Integer(description='Goles de tiro libre')
})

error_response = estadisticas_ns.model('ErrorResponse', {
    'error': fields.String(description='Mensaje de error')
})

# ============================================
# ENDPOINTS
# ============================================

@estadisticas_ns.route('/tabla-posiciones')
class TablaPosiciones(Resource):
    @estadisticas_ns.doc(
        description='Obtener tabla de posiciones del campeonato',
        params={
            'id_campeonato': 'Filtrar por ID del campeonato (opcional)'
        },
        responses={
            200: 'Tabla de posiciones',
            500: 'Error interno del servidor'
        }
    )
    @estadisticas_ns.marshal_list_with(posicion_model, code=200, envelope='tabla_posiciones')
    def get(self):
        """
        Obtiene la tabla de posiciones usando la vista SQL
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

            return tabla, 200

        except Exception as e:
            estadisticas_ns.abort(500, error=str(e))


@estadisticas_ns.route('/goleadores')
class Goleadores(Resource):
    @estadisticas_ns.doc(
        description='Obtener tabla de goleadores del campeonato',
        params={
            'id_campeonato': 'Filtrar por ID del campeonato (opcional)',
            'limit': 'Número máximo de resultados (default: 10)'
        },
        responses={
            200: 'Tabla de goleadores',
            500: 'Error interno del servidor'
        }
    )
    @estadisticas_ns.marshal_list_with(goleador_model, code=200, envelope='goleadores')
    def get(self):
        """
        Obtiene tabla de goleadores
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

            return goleadores, 200

        except Exception as e:
            estadisticas_ns.abort(500, error=str(e))
# ============================================
# ESTADÍSTICAS DE DISCIPLINA
# ============================================

disciplina_jugador_model = estadisticas_ns.model('DisciplinaJugador', {
    'id_jugador': fields.Integer(description='ID del jugador'),
    'nombre': fields.String(description='Nombre completo'),
    'equipo': fields.String(description='Nombre del equipo'),
    'amarillas': fields.Integer(description='Total amarillas'),
    'rojas': fields.Integer(description='Total rojas')
})

disciplina_equipo_model = estadisticas_ns.model('DisciplinaEquipo', {
    'id_equipo': fields.Integer(description='ID del equipo'),
    'equipo': fields.String(description='Nombre del equipo'),
    'amarillas': fields.Integer(description='Total amarillas'),
    'rojas': fields.Integer(description='Total rojas'),
    'total': fields.Integer(description='Total tarjetas'),
    'badge': fields.String(description='Badge especial')
})

tarjetas_jornada_model = estadisticas_ns.model('TarjetasJornada', {
    'jornada': fields.Integer(description='Número de jornada'),
    'amarillas': fields.Integer(description='Amarillas en la jornada'),
    'rojas': fields.Integer(description='Rojas en la jornada')
})


@estadisticas_ns.route('/disciplina')
class EstadisticasDisciplina(Resource):
    @estadisticas_ns.doc(
        description='Obtiene estadísticas de disciplina (tarjetas amarillas y rojas)',
        params={
            'id_campeonato': 'ID del campeonato (opcional)'
        }
    )
    def get(self):
        """
        Obtiene estadísticas completas de disciplina:
        - Top jugadores con más amarillas
        - Top jugadores con más rojas  
        - Disciplina por equipo
        - Tarjetas por jornada
        """
        try:
            id_campeonato = request.args.get('id_campeonato', type=int)
            
            # ========================================
            # 1. TOP JUGADORES CON MÁS AMARILLAS
            # ========================================
            query_amarillas = """
                SELECT 
                    j.id_jugador,
                    CONCAT(j.nombre, ' ', j.apellido) as nombre_completo,
                    e.nombre as equipo,
                    COUNT(t.id_tarjeta) as amarillas
                FROM jugadores j
                INNER JOIN equipos e ON j.id_equipo = e.id_equipo
                INNER JOIN tarjetas t ON j.id_jugador = t.id_jugador
                INNER JOIN partidos p ON t.id_partido = p.id_partido
                WHERE t.tipo = 'amarilla'
            """
            
            if id_campeonato:
                query_amarillas += f" AND p.id_campeonato = {id_campeonato}"
            
            query_amarillas += """
                GROUP BY j.id_jugador, e.nombre
                ORDER BY amarillas DESC
                LIMIT 10
            """
            
            result_amarillas = db.session.execute(text(query_amarillas))
            top_amarillas = [
                {
                    'id_jugador': row[0],
                    'nombre': row[1],
                    'equipo': row[2],
                    'amarillas': row[3]
                }
                for row in result_amarillas
            ]
            
            # ========================================
            # 2. TOP JUGADORES CON MÁS ROJAS
            # ========================================
            query_rojas = """
                SELECT 
                    j.id_jugador,
                    CONCAT(j.nombre, ' ', j.apellido) as nombre_completo,
                    e.nombre as equipo,
                    COUNT(t.id_tarjeta) as rojas
                FROM jugadores j
                INNER JOIN equipos e ON j.id_equipo = e.id_equipo
                INNER JOIN tarjetas t ON j.id_jugador = t.id_jugador
                INNER JOIN partidos p ON t.id_partido = p.id_partido
                WHERE t.tipo = 'roja'
            """
            
            if id_campeonato:
                query_rojas += f" AND p.id_campeonato = {id_campeonato}"
            
            query_rojas += """
                GROUP BY j.id_jugador, e.nombre
                ORDER BY rojas DESC
                LIMIT 10
            """
            
            result_rojas = db.session.execute(text(query_rojas))
            top_rojas = [
                {
                    'id_jugador': row[0],
                    'nombre': row[1],
                    'equipo': row[2],
                    'rojas': row[3]
                }
                for row in result_rojas
            ]
            
            # ========================================
            # 3. DISCIPLINA POR EQUIPO
            # ========================================
            query_equipos = """
                SELECT 
                    e.id_equipo,
                    e.nombre as equipo,
                    SUM(CASE WHEN t.tipo = 'amarilla' THEN 1 ELSE 0 END) as amarillas,
                    SUM(CASE WHEN t.tipo = 'roja' THEN 1 ELSE 0 END) as rojas,
                    COUNT(t.id_tarjeta) as total
                FROM equipos e
                INNER JOIN jugadores j ON e.id_equipo = j.id_equipo
                INNER JOIN tarjetas t ON j.id_jugador = t.id_jugador
                INNER JOIN partidos p ON t.id_partido = p.id_partido
            """
            
            if id_campeonato:
                query_equipos += f" WHERE p.id_campeonato = {id_campeonato}"
            
            query_equipos += """
                GROUP BY e.id_equipo, e.nombre
                ORDER BY total ASC
            """
            
            result_equipos = db.session.execute(text(query_equipos))
            disciplina_equipos = []
            for idx, row in enumerate(result_equipos):
                disciplina_equipos.append({
                    'id_equipo': row[0],
                    'equipo': row[1],
                    'amarillas': int(row[2]),
                    'rojas': int(row[3]),
                    'total': row[4],
                    'badge': 'Equipo Más Limpio' if idx == 0 else None
                })
            
            # ========================================
            # 4. TARJETAS POR JORNADA
            # ========================================
            query_jornadas = """
                SELECT 
                    p.jornada,
                    SUM(CASE WHEN t.tipo = 'amarilla' THEN 1 ELSE 0 END) as amarillas,
                    SUM(CASE WHEN t.tipo = 'roja' THEN 1 ELSE 0 END) as rojas
                FROM partidos p
                INNER JOIN tarjetas t ON p.id_partido = t.id_partido
            """
            
            if id_campeonato:
                query_jornadas += f" WHERE p.id_campeonato = {id_campeonato}"
            
            query_jornadas += """
                GROUP BY p.jornada
                ORDER BY p.jornada
            """
            
            result_jornadas = db.session.execute(text(query_jornadas))
            tarjetas_jornada = [
                {
                    'jornada': row[0],
                    'amarillas': int(row[1]),
                    'rojas': int(row[2])
                }
                for row in result_jornadas
            ]
            
            # ========================================
            # INFORMACIÓN DEL CAMPEONATO
            # ========================================
            campeonato_info = None
            if id_campeonato:
                query_campeonato = """
                    SELECT id_campeonato, nombre 
                    FROM campeonatos 
                    WHERE id_campeonato = :id_campeonato
                """
                result = db.session.execute(
                    text(query_campeonato), 
                    {'id_campeonato': id_campeonato}
                ).fetchone()
                
                if result:
                    campeonato_info = {
                        'id_campeonato': result[0],
                        'nombre': result[1]
                    }
            
            # Calcular totales
            total_amarillas = sum(j['amarillas'] for j in tarjetas_jornada)
            total_rojas = sum(j['rojas'] for j in tarjetas_jornada)
            
            return {
                'campeonato': campeonato_info,
                'top_amarillas': top_amarillas,
                'top_rojas': top_rojas,
                'disciplina_equipos': disciplina_equipos,
                'tarjetas_jornada': tarjetas_jornada,
                'totales': {
                    'amarillas': total_amarillas,
                    'rojas': total_rojas,
                    'total': total_amarillas + total_rojas
                }
            }, 200
            
        except Exception as e:
            print(f"❌ Error en estadísticas de disciplina: {str(e)}")
            import traceback
            traceback.print_exc()
            estadisticas_ns.abort(500, error=str(e))