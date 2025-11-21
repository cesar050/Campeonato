from flask import request, jsonify
from flask_restx import Namespace, fields, Resource
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.middlewares.auth_middleware import role_required
from app.extensions import db
from app.models.partido import Partido
from app.models.campeonato import Campeonato
from app.models.equipo import Equipo
from app.routes.respuestas import ApiResponse, PagedApiResponse
from datetime import datetime

partidos_ns = Namespace('partidos', description='Gestión de partidos de fútbol')

# ============================================
# MODELOS PARA DOCUMENTACIÓN SWAGGER
# ============================================

partido_input_model = partidos_ns.model('PartidoInput', {
    'id_campeonato': fields.Integer(required=True, description='ID del campeonato', example=1),
    'id_equipo_local': fields.Integer(required=True, description='ID del equipo local', example=1),
    'id_equipo_visitante': fields.Integer(required=True, description='ID del equipo visitante', example=2),
    'fecha_partido': fields.DateTime(required=True, description='Fecha y hora del partido (ISO format)', example='2024-11-16T15:00:00'),
    'lugar': fields.String(description='Lugar del partido'),
    'jornada': fields.Integer(description='Número de jornada', example=1)
})

partido_update_model = partidos_ns.model('PartidoUpdate', {
    'fecha_partido': fields.DateTime(description='Fecha y hora del partido (ISO format)'),
    'lugar': fields.String(description='Lugar del partido'),
    'jornada': fields.Integer(description='Número de jornada'),
    'observaciones': fields.String(description='Observaciones del partido')
})

partido_estado_model = partidos_ns.model('PartidoEstado', {
    'estado': fields.String(required=True, description='Estado del partido', enum=['programado', 'en_juego', 'finalizado', 'cancelado'])
})

partido_resultado_model = partidos_ns.model('PartidoResultado', {
    'goles_local': fields.Integer(required=True, description='Goles del equipo local', example=2),
    'goles_visitante': fields.Integer(required=True, description='Goles del equipo visitante', example=1)
})

partido_output_model = partidos_ns.model('PartidoOutput', {
    'id_partido': fields.Integer(description='ID del partido'),
    'id_campeonato': fields.Integer(description='ID del campeonato'),
    'id_equipo_local': fields.Integer(description='ID del equipo local'),
    'id_equipo_visitante': fields.Integer(description='ID del equipo visitante'),
    'fecha_partido': fields.DateTime(description='Fecha y hora del partido'),
    'lugar': fields.String(description='Lugar del partido'),
    'jornada': fields.Integer(description='Número de jornada'),
    'estado': fields.String(description='Estado del partido'),
    'goles_local': fields.Integer(description='Goles del equipo local'),
    'goles_visitante': fields.Integer(description='Goles del equipo visitante'),
    'observaciones': fields.String(description='Observaciones del partido'),
    'fecha_creacion': fields.DateTime(description='Fecha de creación')
})

message_response = partidos_ns.model('MessageResponse', {
    'mensaje': fields.String(description='Mensaje de respuesta')
})

error_response = partidos_ns.model('ErrorResponse', {
    'error': fields.String(description='Mensaje de error'),
    'mensaje': fields.String(description='Mensaje descriptivo adicional')
})

# ============================================
# ENDPOINTS
# ============================================

@partidos_ns.route('')
class PartidoList(Resource):
    @partidos_ns.doc(
        description='Crear nuevo partido (requiere autenticación y rol admin)',
        security='Bearer',
        responses={
            201: 'Partido creado exitosamente',
            400: 'Datos inválidos o equipos no válidos',
            401: 'No autorizado',
            403: 'Permisos insuficientes - solo admin',
            404: 'Campeonato o equipo no encontrado',
            500: 'Error interno del servidor'
        }
    )
    @partidos_ns.expect(partido_input_model, validate=True)
    @partidos_ns.marshal_with(partido_output_model, code=201, envelope='partido')
    @jwt_required()
    @role_required(['admin'])
    def post(self):
        try:
            data = partidos_ns.payload

            if data['id_equipo_local'] == data['id_equipo_visitante']:
                partidos_ns.abort(400, error='Los equipos deben ser diferentes')

            campeonato = Campeonato.query.get(data['id_campeonato'])
            if not campeonato:
                partidos_ns.abort(404, error='Campeonato no encontrado')

            equipo_local = Equipo.query.get(data['id_equipo_local'])
            if not equipo_local:
                partidos_ns.abort(404, error='Equipo local no encontrado')

            equipo_visitante = Equipo.query.get(data['id_equipo_visitante'])
            if not equipo_visitante:
                partidos_ns.abort(404, error='Equipo visitante no encontrado')

            if equipo_local.estado != 'aprobado':
                partidos_ns.abort(400, error='El equipo local no está aprobado')

            if equipo_visitante.estado != 'aprobado':
                partidos_ns.abort(400, error='El equipo visitante no está aprobado')

            nuevo_partido = Partido(
                id_campeonato=data['id_campeonato'],
                id_equipo_local=data['id_equipo_local'],
                id_equipo_visitante=data['id_equipo_visitante'],
                fecha_partido=datetime.fromisoformat(data['fecha_partido']),
                lugar=data.get('lugar'),
                jornada=data.get('jornada', 1),
                estado='programado'
            )

            db.session.add(nuevo_partido)
            db.session.commit()
            return nuevo_partido, 201

        except ValueError:
            db.session.rollback()
            partidos_ns.abort(400, error='Formato de fecha inválido. Use formato ISO: YYYY-MM-DDTHH:MM:SS')
        except Exception as e:
            db.session.rollback()
            partidos_ns.abort(500, error=str(e))

    @partidos_ns.doc(
        description='Listar partidos con filtros opcionales y paginación',
        params={
            'id_campeonato': 'Filtrar por ID del campeonato',
            'estado': 'Filtrar por estado (programado, en_juego, finalizado, cancelado)',
            'jornada': 'Filtrar por número de jornada',
            'id_equipo': 'Filtrar partidos de un equipo específico',
            'page': 'Número de página (default: 1)',
            'per_page': 'Elementos por página (default: 10, max: 100)'
        },
        responses={
            200: 'Lista de partidos paginada',
            500: 'Error interno del servidor'
        }
    )
    def get(self):
        try:
            # Obtener parámetros de filtro
            id_campeonato = request.args.get('id_campeonato')
            estado = request.args.get('estado')
            jornada = request.args.get('jornada')
            id_equipo = request.args.get('id_equipo')
            
            # Obtener parámetros de paginación
            page = request.args.get('page', 1, type=int)
            per_page = request.args.get('per_page', 10, type=int)
            
            # Limitar per_page a un máximo de 100
            per_page = min(per_page, 100)

            # Construir query con filtros
            query = Partido.query

            if id_campeonato:
                query = query.filter_by(id_campeonato=int(id_campeonato))
            if estado:
                query = query.filter_by(estado=estado)
            if jornada:
                query = query.filter_by(jornada=int(jornada))
            if id_equipo:
                equipo_id = int(id_equipo)
                query = query.filter(
                    (Partido.id_equipo_local == equipo_id) |
                    (Partido.id_equipo_visitante == equipo_id)
                )

            # Ordenar
            query = query.order_by(Partido.fecha_partido.desc())

            # Ejecutar paginación en la base de datos
            pagination = query.paginate(
                page=page,
                per_page=per_page,
                error_out=False
            )

            # Construir la URL base con parámetros de filtro (SIN el signo ?)
            base_url = "/partidos"
            filter_params = []
            if id_campeonato:
                filter_params.append(f"id_campeonato={id_campeonato}")
            if estado:
                filter_params.append(f"estado={estado}")
            if jornada:
                filter_params.append(f"jornada={jornada}")
            if id_equipo:
                filter_params.append(f"id_equipo={id_equipo}")

            # Construir URL completa correctamente
            if filter_params:
                full_url = f"{base_url}?{'&'.join(filter_params)}"
            else:
                full_url = base_url

            # Usar PagedApiResponse para respuesta paginada con HATEOAS
            response = PagedApiResponse.ok(
                message="Partidos obtenidos exitosamente",
                data={"partidos": [p.to_dict() for p in pagination.items]},
                page=pagination.page,
                per_page=pagination.per_page,
                total_items=pagination.total,
                total_pages=pagination.pages
            )
            
            # Agregar enlaces de paginación
            response.add_pagination_links(full_url)

            return jsonify(response.to_dict())

        except Exception as e:
            error_response = ApiResponse.internal_server_error(
                message="Error al obtener partidos",
                data={"error": str(e)}
            )
            return jsonify(error_response.to_dict()), 500


@partidos_ns.route('/<int:id_partido>')
@partidos_ns.param('id_partido', 'ID del partido')
class PartidoDetail(Resource):
    @partidos_ns.doc(
        description='Obtener detalles de un partido específico',
        responses={
            200: 'Partido encontrado',
            404: 'Partido no encontrado',
            500: 'Error interno del servidor'
        }
    )
    @partidos_ns.marshal_with(partido_output_model, code=200, envelope='partido')
    def get(self, id_partido):
        try:
            partido = Partido.query.get(id_partido)

            if not partido:
                partidos_ns.abort(404, error='Partido no encontrado')

            return partido, 200

        except Exception as e:
            partidos_ns.abort(500, error=str(e))

    @partidos_ns.doc(
        description='Actualizar datos de un partido (requiere autenticación y rol admin)',
        security='Bearer',
        responses={
            200: 'Partido actualizado',
            400: 'Datos inválidos',
            401: 'No autorizado',
            403: 'Permisos insuficientes - solo admin',
            404: 'Partido no encontrado',
            500: 'Error interno del servidor'
        }
    )
    @partidos_ns.expect(partido_update_model, validate=True)
    @partidos_ns.marshal_with(partido_output_model, code=200, envelope='partido')
    @jwt_required()
    @role_required(['admin'])
    def put(self, id_partido):
        try:
            partido = Partido.query.get(id_partido)

            if not partido:
                partidos_ns.abort(404, error='Partido no encontrado')

            data = partidos_ns.payload

            if 'fecha_partido' in data:
                partido.fecha_partido = datetime.fromisoformat(data['fecha_partido'])

            if 'lugar' in data:
                partido.lugar = data['lugar']

            if 'jornada' in data:
                partido.jornada = int(data['jornada'])

            if 'observaciones' in data:
                partido.observaciones = data['observaciones']

            db.session.commit()
            return partido, 200

        except ValueError:
            db.session.rollback()
            partidos_ns.abort(400, error='Formato de fecha inválido. Use formato ISO: YYYY-MM-DDTHH:MM:SS')
        except Exception as e:
            db.session.rollback()
            partidos_ns.abort(500, error=str(e))

    @partidos_ns.doc(
        description='Eliminar un partido (solo admin, no puede tener goles)',
        security='Bearer',
        responses={
            200: 'Partido eliminado',
            400: 'El partido tiene goles registrados',
            401: 'No autorizado',
            403: 'Permisos insuficientes - solo admin',
            404: 'Partido no encontrado',
            500: 'Error interno del servidor'
        }
    )
    @partidos_ns.marshal_with(message_response, code=200)
    @jwt_required()
    @role_required(['admin'])
    def delete(self, id_partido):
        try:
            partido = Partido.query.get(id_partido)

            if not partido:
                partidos_ns.abort(404, error='Partido no encontrado')

            if partido.goles.count() > 0:
                partidos_ns.abort(400, error='No se puede eliminar un partido que tiene goles registrados')

            db.session.delete(partido)
            db.session.commit()

            return {'mensaje': 'Partido eliminado exitosamente'}, 200

        except Exception as e:
            db.session.rollback()
            partidos_ns.abort(500, error=str(e))


@partidos_ns.route('/<int:id_partido>/estado')
@partidos_ns.param('id_partido', 'ID del partido')
class PartidoEstado(Resource):
    @partidos_ns.doc(
        description='Cambiar estado del partido (solo admin): programado, en_juego, finalizado, cancelado',
        security='Bearer',
        responses={
            200: 'Estado cambiado exitosamente',
            400: 'Estado no válido',
            401: 'No autorizado',
            403: 'Permisos insuficientes - solo admin',
            404: 'Partido no encontrado',
            500: 'Error interno del servidor'
        }
    )
    @partidos_ns.expect(partido_estado_model, validate=True)
    @partidos_ns.marshal_with(partido_output_model, code=200, envelope='partido')
    @jwt_required()
    @role_required(['admin'])
    def patch(self, id_partido):
        try:
            partido = Partido.query.get(id_partido)

            if not partido:
                partidos_ns.abort(404, error='Partido no encontrado')

            data = partidos_ns.payload

            estados_validos = ['programado', 'en_juego', 'finalizado', 'cancelado']
            if data['estado'] not in estados_validos:
                partidos_ns.abort(400, error=f'Estado no válido. Debe ser uno de: {", ".join(estados_validos)}')

            partido.estado = data['estado']
            db.session.commit()

            return partido, 200

        except Exception as e:
            db.session.rollback()
            partidos_ns.abort(500, error=str(e))


@partidos_ns.route('/<int:id_partido>/resultado')
@partidos_ns.param('id_partido', 'ID del partido')
class PartidoResultado(Resource):
    @partidos_ns.doc(
        description='Registrar resultado final del partido (requiere autenticación y rol admin)',
        security='Bearer',
        responses={
            200: 'Resultado registrado exitosamente',
            400: 'Datos inválidos',
            401: 'No autorizado',
            403: 'Permisos insuficientes - solo admin',
            404: 'Partido no encontrado',
            500: 'Error interno del servidor'
        }
    )
    @partidos_ns.expect(partido_resultado_model, validate=True)
    @partidos_ns.marshal_with(partido_output_model, code=200, envelope='partido')
    @jwt_required()
    @role_required(['admin'])
    def patch(self, id_partido):
        try:
            partido = Partido.query.get(id_partido)

            if not partido:
                partidos_ns.abort(404, error='Partido no encontrado')

            data = partidos_ns.payload

            partido.goles_local = int(data['goles_local'])
            partido.goles_visitante = int(data['goles_visitante'])
            partido.estado = 'finalizado'

            db.session.commit()

            return partido, 200

        except Exception as e:
            db.session.rollback()
            partidos_ns.abort(500, error=str(e))