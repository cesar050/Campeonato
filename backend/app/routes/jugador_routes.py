from flask import request
from flask_restx import Namespace, fields, Resource
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.middlewares.auth_middleware import role_required
from app.extensions import db
from app.models.jugador import Jugador
from app.models.equipo import Equipo
from datetime import datetime

jugador_ns = Namespace('jugadores', description='Gestión de jugadores de fútbol')

# ============================================
# MODELOS PARA DOCUMENTACIÓN SWAGGER
# ============================================

jugador_input_model = jugador_ns.model('JugadorInput', {
    'nombre_equipo': fields.String(required=True, description='Nombre del equipo', example='Barcelona FC'),
    'nombre': fields.String(required=True, description='Nombre del jugador', example='Lionel'),
    'apellido': fields.String(required=True, description='Apellido del jugador', example='Messi'),
    'documento': fields.String(required=True, description='Documento de identidad', example='12345678'),
    'dorsal': fields.Integer(required=True, description='Número de dorsal', example=10),
    'posicion': fields.String(description='Posición del jugador', enum=['portero', 'defensa', 'mediocampista', 'delantero'], example='delantero'),
    'fecha_nacimiento': fields.Date(description='Fecha de nacimiento (YYYY-MM-DD)', example='1987-06-24')
})

jugador_update_model = jugador_ns.model('JugadorUpdate', {
    'nombre': fields.String(description='Nombre del jugador'),
    'apellido': fields.String(description='Apellido del jugador'),
    'dorsal': fields.Integer(description='Número de dorsal'),
    'posicion': fields.String(description='Posición del jugador', enum=['portero', 'defensa', 'mediocampista', 'delantero']),
    'fecha_nacimiento': fields.Date(description='Fecha de nacimiento (YYYY-MM-DD)'),
    'activo': fields.Boolean(description='Estado activo del jugador')
})

jugador_estado_model = jugador_ns.model('JugadorEstado', {
    'activo': fields.Boolean(required=True, description='Estado activo del jugador')
})

jugador_output_model = jugador_ns.model('JugadorOutput', {
    'id_jugador': fields.Integer(description='ID del jugador'),
    'id_equipo': fields.Integer(description='ID del equipo'),
    'nombre': fields.String(description='Nombre del jugador'),
    'apellido': fields.String(description='Apellido del jugador'),
    'documento': fields.String(description='Documento de identidad'),
    'dorsal': fields.Integer(description='Número de dorsal'),
    'posicion': fields.String(description='Posición del jugador'),
    'fecha_nacimiento': fields.Date(description='Fecha de nacimiento'),
    'activo': fields.Boolean(description='Estado activo'),
    'fecha_registro': fields.DateTime(description='Fecha de registro'),
    'equipo': fields.String(description='Nombre del equipo')
})

message_response = jugador_ns.model('MessageResponse', {
    'mensaje': fields.String(description='Mensaje de respuesta')
})

error_response = jugador_ns.model('ErrorResponse', {
    'error': fields.String(description='Mensaje de error'),
    'mensaje': fields.String(description='Mensaje descriptivo adicional')
})

# ============================================
# ENDPOINTS
# ============================================

@jugador_ns.route('')
class JugadorList(Resource):
    @jugador_ns.doc(
        description='Crear nuevo jugador usando el nombre del equipo',
        security='Bearer',
        responses={
            201: 'Jugador creado exitosamente',
            400: 'Datos inválidos o validaciones fallidas',
            401: 'No autorizado',
            403: 'Permisos insuficientes',
            404: 'Equipo no encontrado',
            500: 'Error interno del servidor'
        }
    )
    @jugador_ns.expect(jugador_input_model, validate=True)
    @jugador_ns.marshal_with(jugador_output_model, code=201, envelope='jugador')
    @jwt_required()
    @role_required(['admin', 'lider'])
    def post(self):
        """
        Crear jugador usando NOMBRE del equipo en vez de ID
        """
        try:
            data = jugador_ns.payload

            # Validaciones básicas ya manejadas por el modelo

            # Buscar equipo por nombre
            equipo = Equipo.query.filter(
                Equipo.nombre.ilike(f"%{data['nombre_equipo']}%")
            ).first()

            if not equipo:
                jugador_ns.abort(404, error='Equipo no encontrado', mensaje=f'No existe un equipo con el nombre "{data["nombre_equipo"]}"')

            # Verificar que el equipo está aprobado
            if equipo.estado != 'aprobado':
                jugador_ns.abort(400, error='El equipo debe estar aprobado para agregar jugadores')

            # Verificar que no exista un jugador con el mismo documento
            jugador_existente = Jugador.query.filter_by(documento=data['documento']).first()
            if jugador_existente:
                jugador_ns.abort(400, error='Ya existe un jugador con este documento')

            # Verificar que el dorsal no esté ocupado
            dorsal_ocupado = Jugador.query.filter_by(
                id_equipo=equipo.id_equipo,
                dorsal=data['dorsal']
            ).first()
            if dorsal_ocupado:
                jugador_ns.abort(400, error=f'El dorsal {data["dorsal"]} ya está ocupado en {equipo.nombre}')

            # Crear jugador
            nuevo_jugador = Jugador(
                id_equipo=equipo.id_equipo,
                nombre=data['nombre'],
                apellido=data['apellido'],
                documento=data['documento'],
                dorsal=int(data['dorsal']),
                posicion=data.get('posicion', 'delantero'),
                fecha_nacimiento=datetime.fromisoformat(data['fecha_nacimiento']).date() if data.get('fecha_nacimiento') else None
            )

            db.session.add(nuevo_jugador)
            db.session.commit()

            # Agregar información del equipo al resultado
            result = nuevo_jugador.to_dict()
            result['equipo'] = equipo.nombre
            return result, 201

        except ValueError:
            db.session.rollback()
            jugador_ns.abort(400, error='Formato de fecha inválido. Use YYYY-MM-DD')
        except Exception as e:
            db.session.rollback()
            jugador_ns.abort(500, error=str(e))


    @jugador_ns.doc(
        description='Listar todos los jugadores con filtros opcionales',
        params={
            'id_equipo': 'Filtrar por ID del equipo',
            'posicion': 'Filtrar por posición (portero, defensa, mediocampista, delantero)',
            'activo': 'Filtrar por estado activo (true/false)'
        },
        responses={
            200: 'Lista de jugadores',
            500: 'Error interno del servidor'
        }
    )
    @jugador_ns.marshal_list_with(jugador_output_model, code=200, envelope='jugadores')
    def get(self):
        """
        Listar todos los jugadores
        """
        try:
            id_equipo = request.args.get('id_equipo')
            posicion = request.args.get('posicion')
            activo = request.args.get('activo')

            query = Jugador.query

            if id_equipo:
                query = query.filter_by(id_equipo=int(id_equipo))
            if posicion:
                query = query.filter_by(posicion=posicion)
            if activo is not None:
                query = query.filter_by(activo=activo.lower() == 'true')

            jugadores = query.order_by(Jugador.apellido, Jugador.nombre).all()
            return jugadores, 200

        except Exception as e:
            jugador_ns.abort(500, error=str(e))


@jugador_ns.route('/<int:id_jugador>')
@jugador_ns.param('id_jugador', 'ID del jugador')
class JugadorDetail(Resource):
    @jugador_ns.doc(
        description='Obtener detalles de un jugador específico',
        responses={
            200: 'Jugador encontrado',
            404: 'Jugador no encontrado',
            500: 'Error interno del servidor'
        }
    )
    @jugador_ns.marshal_with(jugador_output_model, code=200, envelope='jugador')
    def get(self, id_jugador):
        """
        Obtener jugador por ID
        """
        try:
            jugador = Jugador.query.get(id_jugador)
            if not jugador:
                jugador_ns.abort(404, error='Jugador no encontrado')
            return jugador, 200
        except Exception as e:
            jugador_ns.abort(500, error=str(e))

    @jugador_ns.doc(
        description='Actualizar datos de un jugador (requiere autenticación y rol líder o admin)',
        security='Bearer',
        responses={
            200: 'Jugador actualizado',
            400: 'Datos inválidos o dorsal duplicado',
            401: 'No autorizado',
            403: 'Permisos insuficientes',
            404: 'Jugador no encontrado',
            500: 'Error interno del servidor'
        }
    )
    @jugador_ns.expect(jugador_update_model, validate=True)
    @jugador_ns.marshal_with(jugador_output_model, code=200, envelope='jugador')
    @jwt_required()
    @role_required(['admin', 'lider'])
    def put(self, id_jugador):
        """
        Actualizar jugador
        """
        try:
            jugador = Jugador.query.get(id_jugador)
            if not jugador:
                jugador_ns.abort(404, error='Jugador no encontrado')

            data = jugador_ns.payload

            if 'nombre' in data:
                jugador.nombre = data['nombre']

            if 'apellido' in data:
                jugador.apellido = data['apellido']

            if 'dorsal' in data:
                # Verificar que el dorsal no esté ocupado por otro jugador del mismo equipo
                dorsal_ocupado = Jugador.query.filter_by(
                    id_equipo=jugador.id_equipo,
                    dorsal=data['dorsal']
                ).first()
                if dorsal_ocupado and dorsal_ocupado.id_jugador != id_jugador:
                    jugador_ns.abort(400, error=f'El dorsal {data["dorsal"]} ya está ocupado en este equipo')
                jugador.dorsal = int(data['dorsal'])

            if 'posicion' in data:
                posiciones_validas = ['portero', 'defensa', 'mediocampista', 'delantero']
                if data['posicion'] not in posiciones_validas:
                    jugador_ns.abort(400, error=f'Posición no válida. Debe ser una de: {", ".join(posiciones_validas)}')
                jugador.posicion = data['posicion']

            if 'fecha_nacimiento' in data:
                jugador.fecha_nacimiento = datetime.fromisoformat(data['fecha_nacimiento']).date()

            if 'activo' in data:
                jugador.activo = data['activo']

            db.session.commit()
            return jugador, 200

        except ValueError:
            db.session.rollback()
            jugador_ns.abort(400, error='Formato de fecha inválido. Use YYYY-MM-DD')
        except Exception as e:
            db.session.rollback()
            jugador_ns.abort(500, error=str(e))

    @jugador_ns.doc(
        description='Eliminar un jugador (solo admin, no puede tener estadísticas)',
        security='Bearer',
        responses={
            200: 'Jugador eliminado',
            400: 'El jugador tiene estadísticas registradas',
            401: 'No autorizado',
            403: 'Permisos insuficientes - solo admin',
            404: 'Jugador no encontrado',
            500: 'Error interno del servidor'
        }
    )
    @jugador_ns.marshal_with(message_response, code=200)
    @jwt_required()
    @role_required(['admin'])
    def delete(self, id_jugador):
        """
        Eliminar jugador (solo si no tiene estadísticas)
        """
        try:
            jugador = Jugador.query.get(id_jugador)
            if not jugador:
                jugador_ns.abort(404, error='Jugador no encontrado')

            # Verificar si tiene goles o tarjetas registradas
            if jugador.goles.count() > 0 or jugador.tarjetas.count() > 0:
                jugador_ns.abort(400, error='No se puede eliminar un jugador con estadísticas registradas. Desactívelo en su lugar.')

            db.session.delete(jugador)
            db.session.commit()

            return {'mensaje': 'Jugador eliminado exitosamente'}, 200

        except Exception as e:
            db.session.rollback()
            jugador_ns.abort(500, error=str(e))


@jugador_ns.route('/<int:id_jugador>/estado')
@jugador_ns.param('id_jugador', 'ID del jugador')
class JugadorEstado(Resource):
    @jugador_ns.doc(
        description='Cambiar estado activo/inactivo del jugador (requiere autenticación y rol líder o admin)',
        security='Bearer',
        responses={
            200: 'Estado cambiado exitosamente',
            400: 'Campo activo requerido',
            401: 'No autorizado',
            403: 'Permisos insuficientes',
            404: 'Jugador no encontrado',
            500: 'Error interno del servidor'
        }
    )
    @jugador_ns.expect(jugador_estado_model, validate=True)
    @jugador_ns.marshal_with(jugador_output_model, code=200, envelope='jugador')
    @jwt_required()
    @role_required(['admin', 'lider'])
    def patch(self, id_jugador):
        """
        Cambiar estado del jugador (activar/desactivar)
        """
        try:
            jugador = Jugador.query.get(id_jugador)
            if not jugador:
                jugador_ns.abort(404, error='Jugador no encontrado')

            data = jugador_ns.payload

            if 'activo' not in data:
                jugador_ns.abort(400, error='El campo activo es requerido')

            jugador.activo = data['activo']
            db.session.commit()

            return jugador, 200

        except Exception as e:
            db.session.rollback()
            jugador_ns.abort(500, error=str(e))


@jugador_ns.route('/equipo/<int:id_equipo>/posicion/<string:posicion>')
@jugador_ns.param('id_equipo', 'ID del equipo')
@jugador_ns.param('posicion', 'Posición de los jugadores (portero, defensa, mediocampista, delantero)')
class JugadoresPorPosicion(Resource):
    @jugador_ns.doc(
        description='Obtener jugadores de un equipo por posición (solo activos)',
        responses={
            200: 'Lista de jugadores por posición',
            400: 'Posición no válida',
            404: 'Equipo no encontrado',
            500: 'Error interno del servidor'
        }
    )
    @jugador_ns.marshal_list_with(jugador_output_model, code=200, envelope='jugadores')
    def get(self, id_equipo, posicion):
        """
        Obtener jugadores por posición de un equipo
        """
        try:
            equipo = Equipo.query.get(id_equipo)
            if not equipo:
                jugador_ns.abort(404, error='Equipo no encontrado')

            posiciones_validas = ['portero', 'defensa', 'mediocampista', 'delantero']
            if posicion not in posiciones_validas:
                jugador_ns.abort(400, error=f'Posición no válida. Debe ser una de: {", ".join(posiciones_validas)}')

            jugadores = Jugador.query.filter_by(
                id_equipo=id_equipo,
                posicion=posicion,
                activo=True
            ).all()

            # Agregar información adicional al resultado
            result = []
            for j in jugadores:
                player_dict = j.to_dict()
                player_dict['equipo'] = equipo.nombre
                result.append(player_dict)

            return result, 200

        except Exception as e:
            jugador_ns.abort(500, error=str(e))