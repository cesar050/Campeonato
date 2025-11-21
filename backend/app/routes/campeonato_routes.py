from flask import request
from flask_restx import Namespace, fields, Resource
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.middlewares.auth_middleware import role_required
from app.extensions import db
from app.models.campeonato import Campeonato
from app.models.usuario import Usuario
from app.models.equipo import Equipo
from app.models.partido import Partido
from itertools import combinations
from datetime import datetime, timedelta

campeonato_ns = Namespace('campeonatos', description='Gestión de campeonatos de fútbol')

# ============================================
# MODELOS PARA DOCUMENTACIÓN SWAGGER
# ============================================

campeonato_input_model = campeonato_ns.model('CampeonatoInput', {
    'nombre': fields.String(required=True, description='Nombre del campeonato', example='Liga Profesional 2024'),
    'descripcion': fields.String(description='Descripción del campeonato'),
    'fecha_inicio': fields.Date(required=True, description='Fecha de inicio (YYYY-MM-DD)', example='2024-11-16'),
    'fecha_fin': fields.Date(description='Fecha de fin (YYYY-MM-DD)'),
    'max_equipos': fields.Integer(description='Máximo número de equipos', example=10)
})

campeonato_update_model = campeonato_ns.model('CampeonatoUpdate', {
    'nombre': fields.String(description='Nombre del campeonato'),
    'descripcion': fields.String(description='Descripción del campeonato'),
    'fecha_inicio': fields.Date(description='Fecha de inicio (YYYY-MM-DD)'),
    'fecha_fin': fields.Date(description='Fecha de fin (YYYY-MM-DD)'),
    'max_equipos': fields.Integer(description='Máximo número de equipos')
})

campeonato_estado_model = campeonato_ns.model('CampeonatoEstado', {
    'estado': fields.String(required=True, description='Estado del campeonato', enum=['planificacion', 'en_curso', 'finalizado'])
})

generar_partidos_model = campeonato_ns.model('GenerarPartidos', {
    'fecha_inicio': fields.String(required=True, description='Fecha de inicio (YYYY-MM-DD)', example='2024-11-16'),
    'dias_entre_jornadas': fields.Integer(description='Días entre jornadas', example=7),
    'hora_inicio': fields.String(description='Hora del primer partido', example='15:00'),
    'hora_segundo_partido': fields.String(description='Hora del segundo partido', example='17:00'),
    'incluir_vuelta': fields.Boolean(description='Incluir partidos de vuelta', example=True)
})

campeonato_output_model = campeonato_ns.model('CampeonatoOutput', {
    'id_campeonato': fields.Integer(description='ID del campeonato'),
    'nombre': fields.String(description='Nombre del campeonato'),
    'descripcion': fields.String(description='Descripción del campeonato'),
    'fecha_inicio': fields.Date(description='Fecha de inicio'),
    'fecha_fin': fields.Date(description='Fecha de fin'),
    'max_equipos': fields.Integer(description='Máximo número de equipos'),
    'estado': fields.String(description='Estado del campeonato'),
    'partidos_generados': fields.Boolean(description='Si los partidos fueron generados'),
    'fecha_creacion': fields.DateTime(description='Fecha de creación'),
    'fecha_generacion_partidos': fields.DateTime(description='Fecha de generación de partidos'),
    'creado_por': fields.Integer(description='ID del usuario que creó el campeonato')
})

message_response = campeonato_ns.model('MessageResponse', {
    'mensaje': fields.String(description='Mensaje de respuesta')
})

error_response = campeonato_ns.model('ErrorResponse', {
    'error': fields.String(description='Mensaje de error'),
    'mensaje': fields.String(description='Mensaje descriptivo adicional')
})

"""@campeonato_bp.route('', methods=['POST'])
@jwt_required()
@role_required(['admin'])
def crear_campeonato(): 
    try: 
        data = request.get_json()
        if not data.get('nombre'):
            return jsonify({'error':'El nombre es obligatorio'}),400
        if not data.get('fecha_inicio'):
            return jsonify({'error':'la fecha de inicio es obligatoria'}), 400
        campeonato_existente = Campeonato.query.filter_by(nombre=data['nombre']).first()
        if campeonato_existente:
            return jsonify({'error': 'Ya existe un campeonato con este nombre'}), 400
        current_user = get_jwt_identity()

        nuevo_campeonato = Campeonato(
            nombre=data['nombre'],
            descripcion=data.get('descripcion'),
            fecha_inicio=datetime.fromisoformat(data['fecha_inicio']).date(),
            fecha_fin=datetime.fromisoformat(data['fecha_fin']).date() if data.get('fecha_fin') else None, 
            creado_por=current_user['id_usuario'],
            estado='planificacion'
        )
        db.session.add(nuevo_campeonato)
        db.session.commit()
        return jsonify({
            'mensaje': 'Campeonato creado exitosamente',
            'campeonato': nuevo_campeonato.to_dict()
        }),201

    except ValueError:
        return jsonify({'error': 'Formato de fecha invalido. Usa YYYY-MM-DD'}),400
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500"""

# ============================================
# ENDPOINTS
# ============================================

@campeonato_ns.route('')
class CampeonatoList(Resource):
    @campeonato_ns.doc(
        description='Crear nuevo campeonato (requiere autenticación y rol admin)',
        security='Bearer',
        responses={
            201: 'Campeonato creado exitosamente',
            400: 'Datos inválidos o campeonato ya existe',
            401: 'No autorizado',
            403: 'Permisos insuficientes - solo admin',
            500: 'Error interno del servidor'
        }
    )
    @campeonato_ns.expect(campeonato_input_model, validate=True)
    @campeonato_ns.marshal_with(campeonato_output_model, code=201, envelope='campeonato')
    @jwt_required()
    @role_required(['admin'])
    def post(self):
        try:
            data = campeonato_ns.payload

            # Validaciones ya manejadas por el modelo

            campeonato_existente = Campeonato.query.filter_by(nombre=data['nombre']).first()
            if campeonato_existente:
                campeonato_ns.abort(400, error='Ya existe un campeonato con este nombre')

            current_user_id = get_jwt_identity()

            nuevo_campeonato = Campeonato(
                nombre=data['nombre'],
                descripcion=data.get('descripcion'),
                fecha_inicio=datetime.fromisoformat(data['fecha_inicio']).date(),
                fecha_fin=datetime.fromisoformat(data['fecha_fin']).date() if data.get('fecha_fin') else None,
                creado_por=int(current_user_id),
                estado='planificacion'
            )

            db.session.add(nuevo_campeonato)
            db.session.commit()
            return nuevo_campeonato, 201

        except ValueError:
            db.session.rollback()
            campeonato_ns.abort(400, error='Formato de fecha inválido. Usa YYYY-MM-DD')
        except Exception as e:
            db.session.rollback()
            campeonato_ns.abort(500, error=str(e))

    
    @campeonato_ns.doc(
        description='Listar todos los campeonatos con filtros opcionales',
        params={
            'estado': 'Filtrar por estado (planificacion, en_curso, finalizado)',
            'creado_por': 'Filtrar por ID del usuario que creó el campeonato'
        },
        responses={
            200: 'Lista de campeonatos',
            500: 'Error interno del servidor'
        }
    )
    @campeonato_ns.marshal_list_with(campeonato_output_model, code=200, envelope='campeonatos')
    def get(self):
        try:
            estado = request.args.get('estado')
            creado_por = request.args.get('creado_por')

            query = Campeonato.query
            if estado:
                query = query.filter_by(estado=estado)
            if creado_por:
                query = query.filter_by(creado_por=int(creado_por))
            campeonatos = query.order_by(Campeonato.fecha_creacion.desc()).all()
            return campeonatos, 200
        except Exception as e:
            campeonato_ns.abort(500, error=str(e))

@campeonato_ns.route('/<int:id_campeonato>')
@campeonato_ns.param('id_campeonato', 'ID del campeonato')
class CampeonatoDetail(Resource):
    @campeonato_ns.doc(
        description='Obtener detalles de un campeonato específico',
        responses={
            200: 'Campeonato encontrado',
            404: 'Campeonato no encontrado',
            500: 'Error interno del servidor'
        }
    )
    @campeonato_ns.marshal_with(campeonato_output_model, code=200, envelope='campeonato')
    def get(self, id_campeonato):
        try:
            campeonato = Campeonato.query.get(id_campeonato)
            if not campeonato:
                campeonato_ns.abort(404, error='Campeonato no encontrado')
            return campeonato, 200
        except Exception as e:
            campeonato_ns.abort(500, error=str(e))

    @campeonato_ns.doc(
        description='Actualizar datos de un campeonato (requiere autenticación y rol admin)',
        security='Bearer',
        responses={
            200: 'Campeonato actualizado',
            400: 'Datos inválidos o nombre duplicado',
            401: 'No autorizado',
            403: 'Permisos insuficientes - solo admin',
            404: 'Campeonato no encontrado',
            500: 'Error interno del servidor'
        }
    )
    @campeonato_ns.expect(campeonato_update_model, validate=True)
    @campeonato_ns.marshal_with(campeonato_output_model, code=200, envelope='campeonato')
    @jwt_required()
    @role_required(['admin'])
    def put(self, id_campeonato):
        try:
            campeonato = Campeonato.query.get(id_campeonato)
            if not campeonato:
                campeonato_ns.abort(404, error='Campeonato no encontrado')

            data = campeonato_ns.payload

            if 'nombre' in data:
                existe = Campeonato.query.filter_by(nombre=data['nombre']).first()
                if existe and existe.id_campeonato != id_campeonato:
                    campeonato_ns.abort(400, error='Ya existe un campeonato con este nombre')
                campeonato.nombre = data['nombre']

            if 'descripcion' in data:
                campeonato.descripcion = data['descripcion']

            if 'fecha_inicio' in data:
                campeonato.fecha_inicio = datetime.fromisoformat(data['fecha_inicio']).date()

            if 'fecha_fin' in data:
                campeonato.fecha_fin = datetime.fromisoformat(data['fecha_fin']).date() if data['fecha_fin'] else None

            if 'max_equipos' in data:
                max_equipos = int(data['max_equipos'])
                if max_equipos < 2:
                    campeonato_ns.abort(400, error='El campeonato debe tener al menos 2 equipos')
                campeonato.max_equipos = max_equipos

            db.session.commit()
            return campeonato, 200

        except ValueError:
            db.session.rollback()
            campeonato_ns.abort(400, error='Formato de fecha inválido. Usa YYYY-MM-DD')
        except Exception as e:
            db.session.rollback()
            campeonato_ns.abort(500, error=str(e))

    @campeonato_ns.doc(
        description='Eliminar un campeonato (solo admin, no puede tener partidos)',
        security='Bearer',
        responses={
            200: 'Campeonato eliminado',
            400: 'El campeonato tiene partidos programados',
            401: 'No autorizado',
            403: 'Permisos insuficientes - solo admin',
            404: 'Campeonato no encontrado',
            500: 'Error interno del servidor'
        }
    )
    @campeonato_ns.marshal_with(message_response, code=200)
    @jwt_required()
    @role_required(['admin'])
    def delete(self, id_campeonato):
        try:
            campeonato = Campeonato.query.get(id_campeonato)
            if not campeonato:
                campeonato_ns.abort(404, error='Campeonato no encontrado')
            if campeonato.partidos.count() > 0:
                campeonato_ns.abort(400, error='No se puede eliminar un campeonato que tiene partidos programados')
            db.session.delete(campeonato)
            db.session.commit()
            return {'mensaje': 'Campeonato eliminado exitosamente'}, 200
        except Exception as e:
            db.session.rollback()
            campeonato_ns.abort(500, error=str(e))


@campeonato_ns.route('/<int:id_campeonato>/estado')
@campeonato_ns.param('id_campeonato', 'ID del campeonato')
class CampeonatoEstado(Resource):
    @campeonato_ns.doc(
        description='Cambiar estado del campeonato (solo admin): planificacion, en_curso, finalizado',
        security='Bearer',
        responses={
            200: 'Estado cambiado exitosamente',
            400: 'Estado no válido',
            401: 'No autorizado',
            403: 'Permisos insuficientes - solo admin',
            404: 'Campeonato no encontrado',
            500: 'Error interno del servidor'
        }
    )
    @campeonato_ns.expect(campeonato_estado_model, validate=True)
    @campeonato_ns.marshal_with(campeonato_output_model, code=200, envelope='campeonato')
    @jwt_required()
    @role_required(['admin'])
    def patch(self, id_campeonato):
        try:
            campeonato = Campeonato.query.get(id_campeonato)
            if not campeonato:
                campeonato_ns.abort(404, error='Campeonato no encontrado')

            data = campeonato_ns.payload

            estados_validos = ['planificacion', 'en_curso', 'finalizado']
            if data['estado'] not in estados_validos:
                campeonato_ns.abort(400, error=f'Estado no válido. Debe ser uno de: {", ".join(estados_validos)}')

            campeonato.estado = data['estado']
            db.session.commit()

            return campeonato, 200
        except Exception as e:
            db.session.rollback()
            campeonato_ns.abort(500, error=str(e))

@campeonato_ns.route('/<int:id_campeonato>/partidos')
@campeonato_ns.param('id_campeonato', 'ID del campeonato')
class CampeonatoPartidos(Resource):
    @campeonato_ns.doc(
        description='Obtener todos los partidos de un campeonato',
        responses={
            200: 'Lista de partidos del campeonato',
            404: 'Campeonato no encontrado',
            500: 'Error interno del servidor'
        }
    )
    def get(self, id_campeonato):
        try:
            campeonato = Campeonato.query.get(id_campeonato)
            if not campeonato:
                campeonato_ns.abort(404, error='Campeonato no encontrado')
            partidos = campeonato.partidos.all()
            return {
                'campeonato': campeonato.nombre,
                'total_partidos': len(partidos),
                'partidos': [p.to_dict() for p in partidos]
            }, 200
        except Exception as e:
            campeonato_ns.abort(500, error=str(e))


@campeonato_ns.route('/<int:id_campeonato>/generar-partidos')
@campeonato_ns.param('id_campeonato', 'ID del campeonato')
class GenerarPartidos(Resource):
    @campeonato_ns.doc(
        description='Generar automáticamente todos los partidos del campeonato (requiere autenticación y rol admin)',
        security='Bearer',
        responses={
            201: 'Partidos generados exitosamente',
            400: 'Datos inválidos o partidos ya generados',
            401: 'No autorizado',
            403: 'Permisos insuficientes - solo admin',
            404: 'Campeonato no encontrado',
            500: 'Error interno del servidor'
        }
    )
    @campeonato_ns.expect(generar_partidos_model, validate=True)
    @campeonato_ns.marshal_with(message_response, code=201)
    @jwt_required()
    @role_required(['admin'])
    def post(self, id_campeonato):
        """
        Genera automáticamente todos los partidos del campeonato
        """
        try:
            campeonato = Campeonato.query.get(id_campeonato)
            if not campeonato:
                campeonato_ns.abort(404, error='Campeonato no encontrado')

            # Verificar si ya se generaron partidos
            if campeonato.partidos_generados:
                campeonato_ns.abort(400, error='Los partidos ya fueron generados para este campeonato', mensaje='Si deseas regenerarlos, primero elimina los partidos existentes')

            data = campeonato_ns.payload

            fecha_inicio = datetime.strptime(data['fecha_inicio'], '%Y-%m-%d').date()
            dias_entre_jornadas = data.get('dias_entre_jornadas', 7)
            hora_inicio = data.get('hora_inicio', '15:00')
            hora_segundo = data.get('hora_segundo_partido', '17:00')
            incluir_vuelta = data.get('incluir_vuelta', True)

            # Obtener equipos aprobados
            equipos = Equipo.query.filter_by(estado='aprobado').all()

            if len(equipos) < 2:
                campeonato_ns.abort(400, error='Se necesitan al menos 2 equipos aprobados para generar partidos')

            # Generar combinaciones (todos contra todos)
            partidos_creados = []
            jornada = 1
            fecha_actual = fecha_inicio

            # IDA
            combinaciones = list(combinations(equipos, 2))
            partidos_por_jornada = len(equipos) // 2

            for i in range(0, len(combinaciones), partidos_por_jornada):
                partidos_jornada = combinaciones[i:i+partidos_por_jornada]

                for idx, (equipo_local, equipo_visitante) in enumerate(partidos_jornada):
                    hora = hora_inicio if idx % 2 == 0 else hora_segundo
                    fecha_hora = datetime.combine(fecha_actual, datetime.strptime(hora, '%H:%M').time())

                    nuevo_partido = Partido(
                        id_campeonato=id_campeonato,
                        id_equipo_local=equipo_local.id_equipo,
                        id_equipo_visitante=equipo_visitante.id_equipo,
                        fecha_partido=fecha_hora,
                        lugar=equipo_local.estadio,
                        jornada=jornada,
                        estado='programado'
                    )

                    db.session.add(nuevo_partido)
                    partidos_creados.append(nuevo_partido)

                jornada += 1
                fecha_actual += timedelta(days=dias_entre_jornadas)

            # VUELTA (invertir local y visitante)
            if incluir_vuelta:
                for i in range(0, len(combinaciones), partidos_por_jornada):
                    partidos_jornada = combinaciones[i:i+partidos_por_jornada]

                    for idx, (equipo_visitante, equipo_local) in enumerate(partidos_jornada):
                        hora = hora_inicio if idx % 2 == 0 else hora_segundo
                        fecha_hora = datetime.combine(fecha_actual, datetime.strptime(hora, '%H:%M').time())

                        nuevo_partido = Partido(
                            id_campeonato=id_campeonato,
                            id_equipo_local=equipo_local.id_equipo,
                            id_equipo_visitante=equipo_visitante.id_equipo,
                            fecha_partido=fecha_hora,
                            lugar=equipo_local.estadio,
                            jornada=jornada,
                            estado='programado'
                        )

                        db.session.add(nuevo_partido)
                        partidos_creados.append(nuevo_partido)

                    jornada += 1
                    fecha_actual += timedelta(days=dias_entre_jornadas)

            # Marcar como generados
            campeonato.partidos_generados = True
            campeonato.fecha_generacion_partidos = datetime.utcnow()

            db.session.commit()

            return {
                'mensaje': 'Partidos generados exitosamente',
                'campeonato': campeonato.nombre,
                'total_equipos': len(equipos),
                'total_jornadas': jornada - 1,
                'total_partidos': len(partidos_creados),
                'partidos': [p.to_dict() for p in partidos_creados]
            }, 201

        except Exception as e:
            db.session.rollback()
            campeonato_ns.abort(500, error=str(e))