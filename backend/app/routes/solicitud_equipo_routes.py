from flask import request
from flask_restx import Namespace, fields, Resource
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.middlewares.auth_middleware import role_required
from app.extensions import db
from app.models.solicitud_equipo import SolicitudEquipo
from app.models.equipo import Equipo
from app.models.usuario import Usuario
from datetime import datetime

solicitud_ns = Namespace('solicitudes', description='Gestión de solicitudes de equipos')

# ============================================
# MODELOS PARA DOCUMENTACIÓN SWAGGER
# ============================================

solicitud_input_model = solicitud_ns.model('SolicitudInput', {
    'id_equipo': fields.Integer(required=True, description='ID del equipo', example=1),
    'observaciones': fields.String(description='Observaciones adicionales')
})

solicitud_estado_model = solicitud_ns.model('SolicitudEstado', {
    'estado': fields.String(required=True, description='Estado de la solicitud', enum=['pendiente', 'aprobada', 'rechazada']),
    'observaciones': fields.String(description='Observaciones de la revisión')
})

solicitud_output_model = solicitud_ns.model('SolicitudOutput', {
    'id_solicitud': fields.Integer(description='ID de la solicitud'),
    'id_equipo': fields.Integer(description='ID del equipo'),
    'id_lider': fields.Integer(description='ID del líder'),
    'estado': fields.String(description='Estado de la solicitud'),
    'observaciones': fields.String(description='Observaciones'),
    'revisado_por': fields.Integer(description='ID del administrador que revisó'),
    'fecha_solicitud': fields.DateTime(description='Fecha de la solicitud'),
    'fecha_revision': fields.DateTime(description='Fecha de revisión')
})

message_response = solicitud_ns.model('MessageResponse', {
    'mensaje': fields.String(description='Mensaje de respuesta')
})

error_response = solicitud_ns.model('ErrorResponse', {
    'error': fields.String(description='Mensaje de error'),
    'mensaje': fields.String(description='Mensaje descriptivo adicional')
})

# ============================================
# ENDPOINTS
# ============================================

@solicitud_ns.route('')
class SolicitudList(Resource):
    @solicitud_ns.doc(
        description='Crear nueva solicitud de equipo (requiere autenticación y rol líder)',
        security='Bearer',
        responses={
            201: 'Solicitud creada exitosamente',
            400: 'Equipo requerido',
            401: 'No autorizado',
            403: 'No es líder del equipo',
            404: 'Equipo no encontrado'
        }
    )
    @solicitud_ns.expect(solicitud_input_model, validate=True)
    @solicitud_ns.marshal_with(solicitud_output_model, code=201, envelope='solicitud')
    @jwt_required()
    @role_required(['lider'])
    def post(self):
        try:
            data = solicitud_ns.payload
            current_user_id = int(get_jwt_identity())

            equipo = Equipo.query.get(data['id_equipo'])
            if not equipo:
                solicitud_ns.abort(404, error='Equipo no encontrado')

            if equipo.id_lider != current_user_id:
                solicitud_ns.abort(403, error='Solo el líder del equipo puede crear solicitudes')

            nueva_solicitud = SolicitudEquipo(
                id_equipo=data['id_equipo'],
                id_lider=current_user_id,
                observaciones=data.get('observaciones')
            )

            db.session.add(nueva_solicitud)
            db.session.commit()

            return nueva_solicitud, 201

        except Exception as e:
            db.session.rollback()
            solicitud_ns.abort(500, error=str(e))

    @solicitud_ns.doc(
        description='Listar solicitudes con filtros opcionales (requiere autenticación)',
        security='Bearer',
        params={
            'estado': 'Filtrar por estado (pendiente, aprobada, rechazada)'
        },
        responses={
            200: 'Lista de solicitudes',
            401: 'No autorizado',
            500: 'Error interno del servidor'
        }
    )
    @solicitud_ns.marshal_list_with(solicitud_output_model, code=200, envelope='solicitudes')
    @jwt_required()
    def get(self):
        try:
            estado = request.args.get('estado')

            query = SolicitudEquipo.query

            if estado:
                query = query.filter_by(estado=estado)

            solicitudes = query.order_by(SolicitudEquipo.fecha_solicitud.desc()).all()
            return solicitudes, 200

        except Exception as e:
            solicitud_ns.abort(500, error=str(e))


@solicitud_ns.route('/<int:id_solicitud>')
@solicitud_ns.param('id_solicitud', 'ID de la solicitud')
class SolicitudDetail(Resource):
    @solicitud_ns.doc(
        description='Obtener detalles de una solicitud específica (requiere autenticación)',
        security='Bearer',
        responses={
            200: 'Solicitud encontrada',
            401: 'No autorizado',
            404: 'Solicitud no encontrada',
            500: 'Error interno del servidor'
        }
    )
    @solicitud_ns.marshal_with(solicitud_output_model, code=200, envelope='solicitud')
    @jwt_required()
    def get(self, id_solicitud):
        try:
            solicitud = SolicitudEquipo.query.get(id_solicitud)

            if not solicitud:
                solicitud_ns.abort(404, error='Solicitud no encontrada')

            return solicitud, 200

        except Exception as e:
            solicitud_ns.abort(500, error=str(e))

    @solicitud_ns.doc(
        description='Eliminar una solicitud (solo admin)',
        security='Bearer',
        responses={
            200: 'Solicitud eliminada exitosamente',
            401: 'No autorizado',
            403: 'Permisos insuficientes - solo admin',
            404: 'Solicitud no encontrada',
            500: 'Error interno del servidor'
        }
    )
    @solicitud_ns.marshal_with(message_response, code=200)
    @jwt_required()
    @role_required(['admin'])
    def delete(self, id_solicitud):
        try:
            solicitud = SolicitudEquipo.query.get(id_solicitud)

            if not solicitud:
                solicitud_ns.abort(404, error='Solicitud no encontrada')

            db.session.delete(solicitud)
            db.session.commit()

            return {'mensaje': 'Solicitud eliminada exitosamente'}, 200

        except Exception as e:
            db.session.rollback()
            solicitud_ns.abort(500, error=str(e))


@solicitud_ns.route('/<int:id_solicitud>/estado')
@solicitud_ns.param('id_solicitud', 'ID de la solicitud')
class SolicitudEstado(Resource):
    @solicitud_ns.doc(
        description='Cambiar estado de una solicitud (solo admin): pendiente, aprobada, rechazada',
        security='Bearer',
        responses={
            200: 'Estado cambiado exitosamente',
            400: 'Estado no válido',
            401: 'No autorizado',
            403: 'Permisos insuficientes - solo admin',
            404: 'Solicitud no encontrada',
            500: 'Error interno del servidor'
        }
    )
    @solicitud_ns.expect(solicitud_estado_model, validate=True)
    @solicitud_ns.marshal_with(solicitud_output_model, code=200, envelope='solicitud')
    @jwt_required()
    @role_required(['admin'])
    def patch(self, id_solicitud):
        try:
            solicitud = SolicitudEquipo.query.get(id_solicitud)

            if not solicitud:
                solicitud_ns.abort(404, error='Solicitud no encontrada')

            data = solicitud_ns.payload
            current_user_id = int(get_jwt_identity())

            estados_validos = ['pendiente', 'aprobada', 'rechazada']
            if data['estado'] not in estados_validos:
                solicitud_ns.abort(400, error=f'Estado no válido. Debe ser: {", ".join(estados_validos)}')

            solicitud.estado = data['estado']
            solicitud.revisado_por = current_user_id
            solicitud.fecha_revision = datetime.utcnow()

            if 'observaciones' in data:
                solicitud.observaciones = data['observaciones']

            db.session.commit()

            return solicitud, 200

        except Exception as e:
            db.session.rollback()
            solicitud_ns.abort(500, error=str(e))