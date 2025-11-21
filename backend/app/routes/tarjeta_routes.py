from flask import request
from flask_restx import Namespace, fields, Resource
from flask_jwt_extended import jwt_required
from app.middlewares.auth_middleware import role_required
from app.extensions import db
from app.models.tarjeta import Tarjeta
from app.models.partido import Partido
from app.models.jugador import Jugador

tarjeta_ns = Namespace('tarjetas', description='Gestión de tarjetas en partidos de fútbol')

# ============================================
# MODELOS PARA DOCUMENTACIÓN SWAGGER
# ============================================

tarjeta_input_model = tarjeta_ns.model('TarjetaInput', {
    'id_partido': fields.Integer(required=True, description='ID del partido', example=1),
    'id_jugador': fields.Integer(required=True, description='ID del jugador', example=1),
    'tipo': fields.String(required=True, description='Tipo de tarjeta', enum=['amarilla', 'roja'], example='amarilla'),
    'minuto': fields.Integer(required=True, description='Minuto de la tarjeta (1-120)', example=45),
    'motivo': fields.String(description='Motivo de la tarjeta')
})

tarjeta_output_model = tarjeta_ns.model('TarjetaOutput', {
    'id_tarjeta': fields.Integer(description='ID de la tarjeta'),
    'id_partido': fields.Integer(description='ID del partido'),
    'id_jugador': fields.Integer(description='ID del jugador'),
    'tipo': fields.String(description='Tipo de tarjeta'),
    'minuto': fields.Integer(description='Minuto de la tarjeta'),
    'motivo': fields.String(description='Motivo de la tarjeta'),
    'fecha_creacion': fields.DateTime(description='Fecha de creación')
})

message_response = tarjeta_ns.model('MessageResponse', {
    'mensaje': fields.String(description='Mensaje de respuesta')
})

error_response = tarjeta_ns.model('ErrorResponse', {
    'error': fields.String(description='Mensaje de error'),
    'mensaje': fields.String(description='Mensaje descriptivo adicional')
})

# ============================================
# ENDPOINTS
# ============================================

@tarjeta_ns.route('')
class TarjetaList(Resource):
    @tarjeta_ns.doc(
        description='Crear nueva tarjeta en un partido (requiere autenticación y rol admin)',
        security='Bearer',
        responses={
            201: 'Tarjeta creada exitosamente',
            400: 'Datos inválidos o validaciones fallidas',
            401: 'No autorizado',
            403: 'Permisos insuficientes - solo admin',
            404: 'Partido o jugador no encontrado'
        }
    )
    @tarjeta_ns.expect(tarjeta_input_model, validate=True)
    @tarjeta_ns.marshal_with(tarjeta_output_model, code=201, envelope='tarjeta')
    @jwt_required()
    @role_required(['admin'])
    def post(self):
        try:
            data = tarjeta_ns.payload

            partido = Partido.query.get(data['id_partido'])
            if not partido:
                tarjeta_ns.abort(404, error='Partido no encontrado')

            jugador = Jugador.query.get(data['id_jugador'])
            if not jugador:
                tarjeta_ns.abort(404, error='Jugador no encontrado')

            if jugador.id_equipo not in [partido.id_equipo_local, partido.id_equipo_visitante]:
                tarjeta_ns.abort(400, error='El jugador no pertenece a ninguno de los equipos del partido')

            minuto = int(data['minuto'])
            if minuto < 1 or minuto > 120:
                tarjeta_ns.abort(400, error='El minuto debe estar entre 1 y 120')

            tipos_validos = ['amarilla', 'roja']
            if data['tipo'] not in tipos_validos:
                tarjeta_ns.abort(400, error=f'Tipo no válido. Debe ser: {", ".join(tipos_validos)}')

            nueva_tarjeta = Tarjeta(
                id_partido=data['id_partido'],
                id_jugador=data['id_jugador'],
                tipo=data['tipo'],
                minuto=minuto,
                motivo=data.get('motivo')
            )

            db.session.add(nueva_tarjeta)
            db.session.commit()

            return nueva_tarjeta, 201

        except ValueError:
            db.session.rollback()
            tarjeta_ns.abort(400, error='El minuto debe ser un número válido')
        except Exception as e:
            db.session.rollback()
            tarjeta_ns.abort(500, error=str(e))

    @tarjeta_ns.doc(
        description='Listar tarjetas con filtros opcionales',
        params={
            'id_partido': 'Filtrar por ID del partido',
            'id_jugador': 'Filtrar por ID del jugador',
            'tipo': 'Filtrar por tipo de tarjeta (amarilla, roja)'
        },
        responses={
            200: 'Lista de tarjetas',
            500: 'Error interno del servidor'
        }
    )
    @tarjeta_ns.marshal_list_with(tarjeta_output_model, code=200, envelope='tarjetas')
    def get(self):
        try:
            id_partido = request.args.get('id_partido')
            id_jugador = request.args.get('id_jugador')
            tipo = request.args.get('tipo')

            query = Tarjeta.query

            if id_partido:
                query = query.filter_by(id_partido=int(id_partido))

            if id_jugador:
                query = query.filter_by(id_jugador=int(id_jugador))

            if tipo:
                query = query.filter_by(tipo=tipo)

            tarjetas = query.order_by(Tarjeta.minuto.asc()).all()
            return tarjetas, 200

        except Exception as e:
            tarjeta_ns.abort(500, error=str(e))


@tarjeta_ns.route('/<int:id_tarjeta>')
@tarjeta_ns.param('id_tarjeta', 'ID de la tarjeta')
class TarjetaDetail(Resource):
    @tarjeta_ns.doc(
        description='Obtener detalles de una tarjeta específica',
        responses={
            200: 'Tarjeta encontrada',
            404: 'Tarjeta no encontrada',
            500: 'Error interno del servidor'
        }
    )
    @tarjeta_ns.marshal_with(tarjeta_output_model, code=200, envelope='tarjeta')
    def get(self, id_tarjeta):
        try:
            tarjeta = Tarjeta.query.get(id_tarjeta)

            if not tarjeta:
                tarjeta_ns.abort(404, error='Tarjeta no encontrada')

            return tarjeta, 200

        except Exception as e:
            tarjeta_ns.abort(500, error=str(e))

    @tarjeta_ns.doc(
        description='Eliminar una tarjeta (solo admin)',
        security='Bearer',
        responses={
            200: 'Tarjeta eliminada exitosamente',
            401: 'No autorizado',
            403: 'Permisos insuficientes - solo admin',
            404: 'Tarjeta no encontrada',
            500: 'Error interno del servidor'
        }
    )
    @tarjeta_ns.marshal_with(message_response, code=200)
    @jwt_required()
    @role_required(['admin'])
    def delete(self, id_tarjeta):
        try:
            tarjeta = Tarjeta.query.get(id_tarjeta)

            if not tarjeta:
                tarjeta_ns.abort(404, error='Tarjeta no encontrada')

            db.session.delete(tarjeta)
            db.session.commit()

            return {'mensaje': 'Tarjeta eliminada exitosamente'}, 200

        except Exception as e:
            db.session.rollback()
            tarjeta_ns.abort(500, error=str(e))
