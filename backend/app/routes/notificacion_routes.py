from flask import request
from flask_restx import Namespace, fields, Resource
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.middlewares.auth_middleware import role_required
from app.extensions import db
from app.models.notificacion import Notificacion
from app.models.usuario import Usuario
from app.models.equipo import Equipo

notificacion_ns = Namespace('notificaciones', description='Gestión de notificaciones de usuarios')

# ============================================
# MODELOS PARA DOCUMENTACIÓN SWAGGER
# ============================================

notificacion_input_model = notificacion_ns.model('NotificacionInput', {
    'id_usuario': fields.Integer(required=True, description='ID del usuario destinatario', example=1),
    'titulo': fields.String(required=True, description='Título de la notificación', example='Nueva actualización'),
    'mensaje': fields.String(required=True, description='Mensaje de la notificación', example='Se ha actualizado el sistema'),
    'tipo': fields.String(description='Tipo de notificación', enum=['info', 'warning', 'success', 'error'], example='info'),
    'id_campeonato': fields.Integer(description='ID del campeonato relacionado'),
    'id_partido': fields.Integer(description='ID del partido relacionado'),
    'id_equipo': fields.Integer(description='ID del equipo relacionado')
})

notificacion_output_model = notificacion_ns.model('NotificacionOutput', {
    'id_notificacion': fields.Integer(description='ID de la notificación'),
    'id_usuario': fields.Integer(description='ID del usuario'),
    'titulo': fields.String(description='Título'),
    'mensaje': fields.String(description='Mensaje'),
    'tipo': fields.String(description='Tipo'),
    'leida': fields.Boolean(description='Si fue leída'),
    'fecha_envio': fields.String(description='Fecha de envío'),
    'id_campeonato': fields.Integer(description='ID del campeonato'),
    'id_partido': fields.Integer(description='ID del partido'),
    'id_equipo': fields.Integer(description='ID del equipo')
})

message_response = notificacion_ns.model('MessageResponse', {
    'mensaje': fields.String(description='Mensaje de respuesta')
})

count_response = notificacion_ns.model('CountResponse', {
    'no_leidas': fields.Integer(description='Cantidad de notificaciones no leídas')
})

error_response = notificacion_ns.model('ErrorResponse', {
    'error': fields.String(description='Mensaje de error'),
    'mensaje': fields.String(description='Mensaje descriptivo adicional')
})

# ============================================
# ENDPOINTS
# ============================================

@notificacion_ns.route('')
class NotificacionList(Resource):
    @notificacion_ns.doc(
        description='Crear nueva notificación (requiere autenticación y rol admin)',
        security='Bearer',
        responses={
            201: 'Notificación creada exitosamente',
            400: 'Datos inválidos',
            401: 'No autorizado',
            403: 'Permisos insuficientes - solo admin',
            404: 'Usuario no encontrado'
        }
    )
    @notificacion_ns.expect(notificacion_input_model, validate=True)
    @notificacion_ns.marshal_with(notificacion_output_model, code=201, envelope='notificacion')
    @jwt_required()
    @role_required(['admin', 'superadmin'])
    def post(self):
        try:
            data = notificacion_ns.payload

            usuario = Usuario.query.get(data['id_usuario'])
            if not usuario:
                notificacion_ns.abort(404, error='Usuario no encontrado')

            tipos_validos = ['info', 'warning', 'success', 'error']
            tipo = data.get('tipo', 'info')
            if tipo not in tipos_validos:
                notificacion_ns.abort(400, error=f'Tipo no válido. Debe ser: {", ".join(tipos_validos)}')

            nueva_notificacion = Notificacion(
                id_usuario=data['id_usuario'],
                titulo=data['titulo'],
                mensaje=data['mensaje'],
                tipo=tipo,
                id_campeonato=data.get('id_campeonato'),
                id_partido=data.get('id_partido'),
                id_equipo=data.get('id_equipo')
            )

            db.session.add(nueva_notificacion)
            db.session.commit()

            return nueva_notificacion, 201

        except Exception as e:
            db.session.rollback()
            notificacion_ns.abort(500, error=str(e))


@notificacion_ns.route('/mis-notificaciones')
class MisNotificaciones(Resource):
    @notificacion_ns.doc(
        description='Obtener notificaciones del usuario autenticado',
        security='Bearer',
        params={
            'leida': 'Filtrar por estado de lectura (true/false)',
            'limite': 'Cantidad máxima de notificaciones (por defecto 50)'
        },
        responses={
            200: 'Lista de notificaciones',
            401: 'No autorizado',
            500: 'Error interno del servidor'
        }
    )
    @notificacion_ns.marshal_list_with(notificacion_output_model, code=200, envelope='notificaciones')
    @jwt_required()
    def get(self):
        try:
            current_user_id = get_jwt_identity()['id_usuario']
            leida = request.args.get('leida')
            limite = int(request.args.get('limite', 50))

            query = Notificacion.query.filter_by(id_usuario=current_user_id)

            if leida is not None:
                query = query.filter_by(leida=leida.lower() == 'true')

            notificaciones = query.order_by(Notificacion.fecha_envio.desc()).limit(limite).all()
            return notificaciones, 200

        except Exception as e:
            notificacion_ns.abort(500, error=str(e))


@notificacion_ns.route('/contar-no-leidas')
class ContarNoLeidas(Resource):
    @notificacion_ns.doc(
        description='Contar notificaciones no leídas del usuario autenticado',
        security='Bearer',
        responses={
            200: 'Cantidad de notificaciones no leídas',
            401: 'No autorizado',
            500: 'Error interno del servidor'
        }
    )
    @notificacion_ns.marshal_with(count_response, code=200)
    @jwt_required()
    def get(self):
        try:
            current_user_id = get_jwt_identity()['id_usuario']
            
            count = Notificacion.query.filter_by(
                id_usuario=current_user_id,
                leida=False
            ).count()
            
            return {'no_leidas': count}, 200

        except Exception as e:
            notificacion_ns.abort(500, error=str(e))


@notificacion_ns.route('/leer-todas')
class LeerTodas(Resource):
    @notificacion_ns.doc(
        description='Marcar todas las notificaciones como leídas',
        security='Bearer',
        responses={
            200: 'Todas las notificaciones marcadas como leídas',
            401: 'No autorizado',
            500: 'Error interno del servidor'
        }
    )
    @notificacion_ns.marshal_with(message_response, code=200)
    @jwt_required()
    def put(self):
        try:
            current_user_id = get_jwt_identity()['id_usuario']
            
            Notificacion.query.filter_by(
                id_usuario=current_user_id,
                leida=False
            ).update({'leida': True})
            
            db.session.commit()
            
            return {'mensaje': 'Todas las notificaciones marcadas como leídas'}, 200

        except Exception as e:
            db.session.rollback()
            notificacion_ns.abort(500, error=str(e))


@notificacion_ns.route('/<int:id_notificacion>')
@notificacion_ns.param('id_notificacion', 'ID de la notificación')
class NotificacionDetail(Resource):
    @notificacion_ns.doc(
        description='Obtener detalles de una notificación específica (requiere autenticación)',
        security='Bearer',
        responses={
            200: 'Notificación encontrada',
            401: 'No autorizado',
            404: 'Notificación no encontrada',
            500: 'Error interno del servidor'
        }
    )
    @notificacion_ns.marshal_with(notificacion_output_model, code=200, envelope='notificacion')
    @jwt_required()
    def get(self, id_notificacion):
        try:
            notificacion = Notificacion.query.get(id_notificacion)

            if not notificacion:
                notificacion_ns.abort(404, error='Notificación no encontrada')

            return notificacion, 200

        except Exception as e:
            notificacion_ns.abort(500, error=str(e))

    @notificacion_ns.doc(
        description='Eliminar una notificación (propietario o admin)',
        security='Bearer',
        responses={
            200: 'Notificación eliminada exitosamente',
            401: 'No autorizado',
            403: 'Sin permisos',
            404: 'Notificación no encontrada',
            500: 'Error interno del servidor'
        }
    )
    @notificacion_ns.marshal_with(message_response, code=200)
    @jwt_required()
    def delete(self, id_notificacion):
        try:
            current_user = get_jwt_identity()
            notificacion = Notificacion.query.get(id_notificacion)

            if not notificacion:
                notificacion_ns.abort(404, error='Notificación no encontrada')

            # Verificar permisos
            if notificacion.id_usuario != current_user['id_usuario'] and current_user['rol'] not in ['admin', 'superadmin']:
                notificacion_ns.abort(403, error='No tienes permiso para eliminar esta notificación')

            db.session.delete(notificacion)
            db.session.commit()

            return {'mensaje': 'Notificación eliminada exitosamente'}, 200

        except Exception as e:
            db.session.rollback()
            notificacion_ns.abort(500, error=str(e))


@notificacion_ns.route('/<int:id_notificacion>/marcar-leida')
@notificacion_ns.param('id_notificacion', 'ID de la notificación')
class MarcarLeida(Resource):
    @notificacion_ns.doc(
        description='Marcar una notificación como leída (solo el propietario)',
        security='Bearer',
        responses={
            200: 'Notificación marcada como leída',
            401: 'No autorizado',
            403: 'No tienes permiso para esta notificación',
            404: 'Notificación no encontrada',
            500: 'Error interno del servidor'
        }
    )
    @notificacion_ns.marshal_with(notificacion_output_model, code=200, envelope='notificacion')
    @jwt_required()
    def patch(self, id_notificacion):
        try:
            current_user_id = get_jwt_identity()['id_usuario']
            notificacion = Notificacion.query.get(id_notificacion)

            if not notificacion:
                notificacion_ns.abort(404, error='Notificación no encontrada')

            if notificacion.id_usuario != current_user_id:
                notificacion_ns.abort(403, error='No tienes permiso para marcar esta notificación')

            notificacion.leida = True
            db.session.commit()

            return notificacion, 200

        except Exception as e:
            db.session.rollback()
            notificacion_ns.abort(500, error=str(e))


# ============================================
# FUNCIÓN HELPER PARA CREAR NOTIFICACIONES
# ============================================
def crear_notificacion(
    id_usuario: int,
    titulo: str,
    mensaje: str,
    tipo: str = 'info',
    id_campeonato: int = None,
    id_partido: int = None,
    id_equipo: int = None,
    datos_adicionales: dict = None
):
    """Crea una nueva notificación"""
    try:
        notificacion = Notificacion(
            id_usuario=id_usuario,
            titulo=titulo,
            mensaje=mensaje,
            tipo=tipo,
            id_campeonato=id_campeonato,
            id_partido=id_partido,
            id_equipo=id_equipo,
            datos_adicionales=datos_adicionales
        )
        
        db.session.add(notificacion)
        db.session.commit()
        
        return True
    except Exception as e:
        db.session.rollback()
        print(f"❌ Error al crear notificación: {e}")
        return False