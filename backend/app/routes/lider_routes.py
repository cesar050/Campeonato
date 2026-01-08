from flask import request
from flask_restx import Namespace, fields, Resource
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.middlewares.auth_middleware import role_required
from app.extensions import db
from app.models.equipo import Equipo
from app.models.partido import Partido
from app.models.jugador import Jugador
from app.models.gol import Gol
from app.models.tarjeta import Tarjeta
from app.models.notificacion import Notificacion
from app.models.campeonato import Campeonato
from app.models.campeonato_equipo import CampeonatoEquipo
from app.models.usuario import Usuario
from datetime import datetime, timedelta
from sqlalchemy import or_, and_

lider_ns = Namespace('lider', description='Endpoints para líder de equipo')

# ============================================
# MODELOS SWAGGER
# ============================================

partido_lider_model = lider_ns.model('PartidoLider', {
    'id_partido': fields.Integer(description='ID del partido'),
    'campeonato': fields.String(description='Nombre del campeonato'),
    'equipo_local': fields.String(description='Equipo local'),
    'equipo_visitante': fields.String(description='Equipo visitante'),
    'fecha_partido': fields.DateTime(description='Fecha del partido'),
    'lugar': fields.String(description='Lugar del partido'),
    'jornada': fields.Integer(description='Jornada'),
    'estado': fields.String(description='Estado del partido'),
    'goles_local': fields.Integer(description='Goles local'),
    'goles_visitante': fields.Integer(description='Goles visitante'),
    'es_local': fields.Boolean(description='Si mi equipo es local')
})

estadisticas_model = lider_ns.model('EstadisticasEquipo', {
    'equipo': fields.String(description='Nombre del equipo'),
    'partidos_jugados': fields.Integer(description='Partidos jugados'),
    'ganados': fields.Integer(description='Partidos ganados'),
    'empatados': fields.Integer(description='Partidos empatados'),
    'perdidos': fields.Integer(description='Partidos perdidos'),
    'goles_favor': fields.Integer(description='Goles a favor'),
    'goles_contra': fields.Integer(description='Goles en contra'),
    'diferencia_goles': fields.Integer(description='Diferencia de goles'),
    'puntos': fields.Integer(description='Puntos totales'),
    'tarjetas_amarillas': fields.Integer(description='Tarjetas amarillas'),
    'tarjetas_rojas': fields.Integer(description='Tarjetas rojas')
})

notificacion_model = lider_ns.model('Notificacion', {
    'id_notificacion': fields.Integer(description='ID de la notificación'),
    'titulo': fields.String(description='Título'),
    'mensaje': fields.String(description='Mensaje'),
    'tipo': fields.String(description='Tipo de notificación'),
    'leida': fields.Boolean(description='Si fue leída'),
    'fecha_envio': fields.DateTime(description='Fecha de envío')
})

pagination_model = lider_ns.model('Pagination', {
    'page': fields.Integer(description='Página actual'),
    'per_page': fields.Integer(description='Elementos por página'),
    'total_pages': fields.Integer(description='Total de páginas'),
    'total_items': fields.Integer(description='Total de elementos'),
    'has_next': fields.Boolean(description='Tiene siguiente página'),
    'has_prev': fields.Boolean(description='Tiene página anterior')
})

partidos_response_model = lider_ns.model('PartidosResponse', {
    'partidos': fields.List(fields.Nested(partido_lider_model)),
    'pagination': fields.Nested(pagination_model)
})

# ============================================
# ENDPOINTS
# ============================================

@lider_ns.route('/mis-equipos')
class MisEquiposLider(Resource):
    @lider_ns.doc(
        description='Obtener todos los equipos del líder autenticado',
        security='Bearer'
    )
    @jwt_required()
    @role_required(['lider', 'admin', 'superadmin'])
    def get(self):
        """Obtiene todos los equipos donde el usuario autenticado es líder"""
        try:
            current_user_id = get_jwt_identity()
            
            equipos = Equipo.query.filter_by(id_lider=int(current_user_id)).all()
            
            # Enriquecer con información de inscripciones
            resultado = []
            for equipo in equipos:
                equipo_dict = equipo.to_dict()
                
                # Contar jugadores activos
                total_jugadores = Jugador.query.filter_by(
                    id_equipo=equipo.id_equipo,
                    activo=True
                ).count()
                equipo_dict['total_jugadores'] = total_jugadores
                
                # Obtener inscripciones del equipo
                inscripciones = CampeonatoEquipo.query.filter_by(id_equipo=equipo.id_equipo).all()
                
                equipo_dict['campeonatos'] = []
                for insc in inscripciones:
                    equipo_dict['campeonatos'].append({
                        'id_campeonato': insc.id_campeonato,
                        'nombre_campeonato': insc.campeonato.nombre,
                        'estado_inscripcion': insc.estado_inscripcion,
                        'fecha_inscripcion': insc.fecha_inscripcion.isoformat() if insc.fecha_inscripcion else None
                    })
                
                resultado.append(equipo_dict)
            
            return {
                'total_equipos': len(resultado),
                'equipos': resultado
            }, 200
            
        except Exception as e:
            lider_ns.abort(500, error=f'Error al obtener equipos: {str(e)}')


@lider_ns.route('/partidos')
class PartidosLider(Resource):
    @lider_ns.doc(
        description='Obtener partidos de un equipo con paginación y filtros',
        security='Bearer',
        params={
            'id_equipo': 'ID del equipo (requerido)',
            'page': 'Número de página (default: 1)',
            'per_page': 'Registros por página (default: 20, max: 100)',
            'estado': 'Filtrar por estado (programado, en_juego, finalizado, cancelado)',
            'fecha_desde': 'Filtrar desde fecha (YYYY-MM-DD)',
            'fecha_hasta': 'Filtrar hasta fecha (YYYY-MM-DD)',
            'es_local': 'Filtrar solo partidos locales (true/false)',
            'mes': 'Filtrar por mes (1-12)',
            'anio': 'Filtrar por año (YYYY)'
        }
    )
    @lider_ns.marshal_with(partidos_response_model, code=200)
    @jwt_required()
    @role_required(['lider', 'admin', 'superadmin'])
    def get(self):
        """Obtiene los partidos de un equipo con paginación"""
        try:
            # Parámetros obligatorios
            id_equipo = request.args.get('id_equipo', type=int)
            if not id_equipo:
                lider_ns.abort(400, error='id_equipo es requerido')
            
            # Parámetros de paginación
            page = request.args.get('page', 1, type=int)
            per_page = request.args.get('per_page', 20, type=int)
            per_page = min(per_page, 100)  # Máximo 100 por página
            
            # Filtros
            estado = request.args.get('estado')
            fecha_desde = request.args.get('fecha_desde')
            fecha_hasta = request.args.get('fecha_hasta')
            es_local = request.args.get('es_local')
            mes = request.args.get('mes', type=int)
            anio = request.args.get('anio', type=int)
            
            # Verificar que el equipo pertenezca al líder
            current_user_id = get_jwt_identity()
            equipo = Equipo.query.get(id_equipo)
            
            if not equipo:
                lider_ns.abort(404, error='Equipo no encontrado')
            
            if equipo.id_lider != int(current_user_id):
                usuario = Usuario.query.get(int(current_user_id))
                if usuario.rol not in ['admin', 'superadmin']:
                    lider_ns.abort(403, error='No tienes permiso para ver los partidos de este equipo')
            
            # Construir query
            query = Partido.query.filter(
                or_(
                    Partido.id_equipo_local == id_equipo,
                    Partido.id_equipo_visitante == id_equipo
                )
            )
            
            # Aplicar filtros
            if estado:
                query = query.filter_by(estado=estado)
            
            if fecha_desde:
                try:
                    fecha_desde_dt = datetime.strptime(fecha_desde, '%Y-%m-%d')
                    query = query.filter(Partido.fecha_partido >= fecha_desde_dt)
                except ValueError:
                    lider_ns.abort(400, error='Formato de fecha_desde inválido. Use YYYY-MM-DD')
            
            if fecha_hasta:
                try:
                    fecha_hasta_dt = datetime.strptime(fecha_hasta, '%Y-%m-%d')
                    # Agregar 1 día para incluir todo el día
                    fecha_hasta_dt = fecha_hasta_dt + timedelta(days=1)
                    query = query.filter(Partido.fecha_partido < fecha_hasta_dt)
                except ValueError:
                    lider_ns.abort(400, error='Formato de fecha_hasta inválido. Use YYYY-MM-DD')
            
            if mes and anio:
                # Filtrar por mes y año específicos
                from calendar import monthrange
                primer_dia = datetime(anio, mes, 1)
                ultimo_dia_num = monthrange(anio, mes)[1]
                ultimo_dia = datetime(anio, mes, ultimo_dia_num, 23, 59, 59)
                
                query = query.filter(
                    and_(
                        Partido.fecha_partido >= primer_dia,
                        Partido.fecha_partido <= ultimo_dia
                    )
                )
            
            if es_local is not None:
                es_local_bool = es_local.lower() == 'true'
                if es_local_bool:
                    query = query.filter(Partido.id_equipo_local == id_equipo)
                else:
                    query = query.filter(Partido.id_equipo_visitante == id_equipo)
            
            # Ordenar por fecha (más recientes primero)
            query = query.order_by(Partido.fecha_partido.desc())
            
            # Paginar
            pagination = query.paginate(
                page=page,
                per_page=per_page,
                error_out=False
            )
            
            # Formatear respuesta
            resultado = []
            for p in pagination.items:
                resultado.append({
                    'id_partido': p.id_partido,
                    'id_campeonato': p.id_campeonato,  # ← AGREGADO: Necesario para cargar equipos
                    'id_equipo_local': p.id_equipo_local,
                    'id_equipo_visitante': p.id_equipo_visitante,
                    'campeonato': p.campeonato.nombre,
                    'equipo_local': p.equipo_local.nombre,
                    'equipo_visitante': p.equipo_visitante.nombre,
                    'fecha_partido': p.fecha_partido.isoformat() if p.fecha_partido else None,
                    'lugar': p.lugar,
                    'jornada': p.jornada,
                    'estado': p.estado,
                    'goles_local': p.goles_local,
                    'goles_visitante': p.goles_visitante,
                    'es_local': (p.id_equipo_local == id_equipo)
                })
            
            return {
                'partidos': resultado,
                'pagination': {
                    'page': pagination.page,
                    'per_page': pagination.per_page,
                    'total_pages': pagination.pages,
                    'total_items': pagination.total,
                    'has_next': pagination.has_next,
                    'has_prev': pagination.has_prev
                }
            }, 200
            
        except Exception as e:
            lider_ns.abort(500, error=f'Error al obtener partidos: {str(e)}')


@lider_ns.route('/estadisticas/<int:id_equipo>')
@lider_ns.param('id_equipo', 'ID del equipo')
class EstadisticasEquipo(Resource):
    @lider_ns.doc(
        description='Obtener estadísticas completas de un equipo',
        security='Bearer'
    )
    @lider_ns.marshal_with(estadisticas_model, code=200, envelope='estadisticas')
    @jwt_required()
    @role_required(['lider', 'admin', 'superadmin'])
    def get(self, id_equipo):
        """Obtiene las estadísticas del equipo"""
        try:
            # Verificar equipo
            equipo = Equipo.query.get(id_equipo)
            if not equipo:
                lider_ns.abort(404, error='Equipo no encontrado')
            
            # Verificar permisos
            current_user_id = get_jwt_identity()
            if equipo.id_lider != int(current_user_id):
                usuario = Usuario.query.get(int(current_user_id))
                if usuario.rol not in ['admin', 'superadmin']:
                    lider_ns.abort(403, error='No tienes permiso para ver estas estadísticas')
            
            # Obtener partidos finalizados
            partidos = Partido.query.filter(
                and_(
                    or_(
                        Partido.id_equipo_local == id_equipo,
                        Partido.id_equipo_visitante == id_equipo
                    ),
                    Partido.estado == 'finalizado'
                )
            ).all()
            
            # Calcular estadísticas
            ganados = 0
            empatados = 0
            perdidos = 0
            goles_favor = 0
            goles_contra = 0
            
            for p in partidos:
                if p.id_equipo_local == id_equipo:
                    goles_favor += p.goles_local
                    goles_contra += p.goles_visitante
                    if p.goles_local > p.goles_visitante:
                        ganados += 1
                    elif p.goles_local < p.goles_visitante:
                        perdidos += 1
                    else:
                        empatados += 1
                else:
                    goles_favor += p.goles_visitante
                    goles_contra += p.goles_local
                    if p.goles_visitante > p.goles_local:
                        ganados += 1
                    elif p.goles_visitante < p.goles_local:
                        perdidos += 1
                    else:
                        empatados += 1
            
            # Obtener tarjetas
            jugadores_ids = [j.id_jugador for j in equipo.jugadores.filter_by(activo=True).all()]
            
            tarjetas_amarillas = 0
            tarjetas_rojas = 0
            
            if jugadores_ids:
                tarjetas_amarillas = Tarjeta.query.filter(
                    and_(
                        Tarjeta.id_jugador.in_(jugadores_ids),
                        Tarjeta.tipo == 'amarilla'
                    )
                ).count()
                
                tarjetas_rojas = Tarjeta.query.filter(
                    and_(
                        Tarjeta.id_jugador.in_(jugadores_ids),
                        Tarjeta.tipo == 'roja'
                    )
                ).count()
            
            return {
                'equipo': equipo.nombre,
                'partidos_jugados': len(partidos),
                'ganados': ganados,
                'empatados': empatados,
                'perdidos': perdidos,
                'goles_favor': goles_favor,
                'goles_contra': goles_contra,
                'diferencia_goles': goles_favor - goles_contra,
                'puntos': (ganados * 3) + empatados,
                'tarjetas_amarillas': tarjetas_amarillas,
                'tarjetas_rojas': tarjetas_rojas
            }, 200
            
        except Exception as e:
            lider_ns.abort(500, error=f'Error al obtener estadísticas: {str(e)}')


@lider_ns.route('/notificaciones')
class NotificacionesLider(Resource):
    @lider_ns.doc(
        description='Obtener notificaciones del líder autenticado con paginación',
        security='Bearer',
        params={
            'page': 'Número de página (default: 1)',
            'per_page': 'Registros por página (default: 20, max: 100)',
            'solo_no_leidas': 'Filtrar solo no leídas (true/false)'
        }
    )
    @jwt_required()
    @role_required(['lider', 'admin', 'superadmin'])
    def get(self):
        """Obtiene las notificaciones del líder con paginación"""
        try:
            current_user_id = get_jwt_identity()
            
            # Parámetros de paginación
            page = request.args.get('page', 1, type=int)
            per_page = request.args.get('per_page', 20, type=int)
            per_page = min(per_page, 100)
            
            solo_no_leidas = request.args.get('solo_no_leidas', 'false').lower() == 'true'
            
            query = Notificacion.query.filter_by(id_usuario=int(current_user_id))
            
            if solo_no_leidas:
                query = query.filter_by(leida=False)
            
            query = query.order_by(Notificacion.fecha_envio.desc())
            
            # Paginar
            pagination = query.paginate(
                page=page,
                per_page=per_page,
                error_out=False
            )
            
            return {
                'notificaciones': [n.to_dict() for n in pagination.items],
                'pagination': {
                    'page': pagination.page,
                    'per_page': pagination.per_page,
                    'total_pages': pagination.pages,
                    'total_items': pagination.total,
                    'has_next': pagination.has_next,
                    'has_prev': pagination.has_prev
                }
            }, 200
            
        except Exception as e:
            lider_ns.abort(500, error=f'Error al obtener notificaciones: {str(e)}')


@lider_ns.route('/notificaciones/<int:id_notificacion>/leer')
@lider_ns.param('id_notificacion', 'ID de la notificación')
class MarcarNotificacionLeida(Resource):
    @lider_ns.doc(
        description='Marcar notificación como leída',
        security='Bearer'
    )
    @jwt_required()
    @role_required(['lider', 'admin', 'superadmin'])
    def put(self, id_notificacion):
        """Marca una notificación como leída"""
        try:
            current_user_id = get_jwt_identity()
            
            notificacion = Notificacion.query.get(id_notificacion)
            
            if not notificacion:
                lider_ns.abort(404, error='Notificación no encontrada')
            
            if notificacion.id_usuario != int(current_user_id):
                lider_ns.abort(403, error='No tienes permiso para marcar esta notificación')
            
            notificacion.leida = True
            db.session.commit()
            
            return {'mensaje': 'Notificación marcada como leída'}, 200
            
        except Exception as e:
            db.session.rollback()
            lider_ns.abort(500, error=f'Error al marcar notificación: {str(e)}')