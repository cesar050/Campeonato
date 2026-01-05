from flask import request
from flask_restx import Namespace, fields, Resource
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.middlewares.auth_middleware import role_required
from app.extensions import db
from app.models.equipo import Equipo
from app.models.usuario import Usuario
from app.models.historial_estado import HistorialEstado
from app.models.campeonato import Campeonato
from app.models.campeonato_equipo import CampeonatoEquipo
from datetime import datetime

equipo_ns = Namespace('equipos', description='Gestión de equipos de fútbol')

# ============================================
# MODELOS SWAGGER
# ============================================

equipo_input_model = equipo_ns.model('EquipoInput', {
    'nombre': fields.String(required=True, description='Nombre del equipo', example='Barcelona FC'),
    'nombre_lider': fields.String(required=True, description='Nombre del líder del equipo', example='Juan Pérez'),
    'estadio': fields.String(required=True, description='Nombre del estadio', example='Camp Nou'),
    'logo_url': fields.String(description='URL del logo del equipo'),
    'tipo_deporte': fields.String(description='Tipo de deporte', enum=['futbol', 'indoor'], example='futbol'),
    'max_jugadores': fields.Integer(description='Máximo de jugadores', example=22)
})

equipo_update_model = equipo_ns.model('EquipoUpdate', {
    'nombre': fields.String(description='Nombre del equipo'),
    'estadio': fields.String(description='Nombre del estadio'),
    'logo_url': fields.String(description='URL del logo del equipo'),
    'tipo_deporte': fields.String(description='Tipo de deporte', enum=['futbol', 'indoor']),
    'max_jugadores': fields.Integer(description='Máximo de jugadores')
})

equipo_estado_model = equipo_ns.model('EquipoEstado', {
    'estado': fields.String(required=True, description='Estado del equipo', enum=['pendiente', 'aprobado', 'rechazado']),
    'observaciones': fields.String(description='Observaciones sobre el cambio de estado')
})

lider_model = equipo_ns.model('Lider', {
    'id_usuario': fields.Integer(description='ID del líder'),
    'nombre': fields.String(description='Nombre del líder'),
    'email': fields.String(description='Email del líder')
})

equipo_output_model = equipo_ns.model('EquipoOutput', {
    'id_equipo': fields.Integer(description='ID del equipo'),
    'nombre': fields.String(description='Nombre del equipo'),
    'logo_url': fields.String(description='URL del logo'),
    'estadio': fields.String(description='Nombre del estadio'),
    'max_jugadores': fields.Integer(description='Máximo de jugadores'),
    'tipo_deporte': fields.String(description='Tipo de deporte'),
    'estado': fields.String(description='Estado del equipo'),
    'fecha_registro': fields.DateTime(description='Fecha de registro'),
    'fecha_aprobacion': fields.DateTime(description='Fecha de aprobación'),
    'observaciones': fields.String(description='Observaciones'),
    'lider': fields.Nested(lider_model, description='Datos del líder'),
    'total_jugadores': fields.Integer(description='Total de jugadores activos')
})

message_response = equipo_ns.model('MessageResponse', {
    'mensaje': fields.String(description='Mensaje de respuesta')
})

# ============================================
# ENDPOINTS
# ============================================

@equipo_ns.route('')
class EquipoList(Resource):
    @equipo_ns.doc(
        description='Listar equipos con filtros, búsqueda y ordenación',
        params={
            'estado': 'Filtrar por estado (pendiente, aprobado, rechazado)',
            'tipo_deporte': 'Filtrar por tipo de deporte (futbol, indoor)',
            'id_lider': 'Filtrar por ID del líder',
            'buscar': 'Buscar por nombre del equipo o líder',
            'ordenar_por': 'Ordenar por campo (nombre, fecha_registro, total_jugadores)',
            'orden': 'Orden ascendente (asc) o descendente (desc)'
        }
    )
    @equipo_ns.marshal_list_with(equipo_output_model, code=200, envelope='equipos')
    def get(self):
        try:
            # Filtros
            estado = request.args.get('estado')
            tipo_deporte = request.args.get('tipo_deporte')
            id_lider = request.args.get('id_lider')
            buscar = request.args.get('buscar')
            
            # Ordenación
            ordenar_por = request.args.get('ordenar_por', 'fecha_registro')
            orden = request.args.get('orden', 'desc')

            query = Equipo.query

            # Aplicar filtros
            if estado:
                query = query.filter_by(estado=estado)
            if tipo_deporte:
                query = query.filter_by(tipo_deporte=tipo_deporte)
            if id_lider:
                query = query.filter_by(id_lider=int(id_lider))
            if buscar:
                query = query.join(Usuario).filter(
                    db.or_(
                        Equipo.nombre.ilike(f'%{buscar}%'),
                        Usuario.nombre.ilike(f'%{buscar}%')
                    )
                )

            # Aplicar ordenación
            if ordenar_por == 'nombre':
                query = query.order_by(Equipo.nombre.desc() if orden == 'desc' else Equipo.nombre.asc())
            else:
                query = query.order_by(Equipo.fecha_registro.desc() if orden == 'desc' else Equipo.fecha_registro.asc())

            equipos = query.all()
            return [e.to_dict() for e in equipos], 200

        except Exception as e:
            equipo_ns.abort(500, error=str(e))

    @equipo_ns.doc(
        description='Crear nuevo equipo (requiere autenticación y rol líder o admin)',
        security='Bearer'
    )
    @equipo_ns.expect(equipo_input_model, validate=True)
    @equipo_ns.marshal_with(equipo_output_model, code=201, envelope='equipo')
    @jwt_required()
    @role_required(['admin', 'lider'])
    def post(self):
        try:
            data = equipo_ns.payload

            # Buscar líder por nombre
            lider = Usuario.query.filter(
                Usuario.nombre.ilike(f"%{data['nombre_lider']}%")
            ).first()

            if not lider:
                equipo_ns.abort(404, error='Líder no encontrado', mensaje=f'No existe un usuario con el nombre "{data["nombre_lider"]}"')

            if lider.rol not in ['lider', 'admin']:
                equipo_ns.abort(400, error='El usuario debe tener rol de líder o admin')

            # Verificar equipo duplicado
            if Equipo.query.filter_by(nombre=data['nombre']).first():
                equipo_ns.abort(400, error='Ya existe un equipo con este nombre')

            # Determinar max_jugadores según tipo_deporte
            tipo_deporte = data.get('tipo_deporte', 'futbol')
            max_jugadores = data.get('max_jugadores')
            
            if not max_jugadores:
                max_jugadores = 12 if tipo_deporte == 'indoor' else 22

            # Crear equipo
            nuevo_equipo = Equipo(
                nombre=data['nombre'],
                logo_url=data.get('logo_url'),
                estadio=data['estadio'],
                tipo_deporte=tipo_deporte,
                max_jugadores=max_jugadores,
                id_lider=lider.id_usuario,
                estado='pendiente'
            )

            db.session.add(nuevo_equipo)
            db.session.commit()

            return nuevo_equipo.to_dict(), 201

        except Exception as e:
            db.session.rollback()
            equipo_ns.abort(500, error=str(e))


@equipo_ns.route('/<int:id_equipo>')
@equipo_ns.param('id_equipo', 'ID del equipo')
class EquipoDetail(Resource):
    @equipo_ns.doc(description='Obtener detalles de un equipo específico')
    @equipo_ns.marshal_with(equipo_output_model, code=200, envelope='equipo')
    def get(self, id_equipo):
        try:
            equipo = Equipo.query.get(id_equipo)
            if not equipo:
                equipo_ns.abort(404, error='Equipo no encontrado')
            return equipo.to_dict(include_jugadores=True), 200
        except Exception as e:
            equipo_ns.abort(500, error=str(e))

    @equipo_ns.doc(description='Actualizar equipo (líder o admin)', security='Bearer')
    @equipo_ns.expect(equipo_update_model, validate=True)
    @equipo_ns.marshal_with(equipo_output_model, code=200, envelope='equipo')
    @jwt_required()
    @role_required(['admin', 'lider'])
    def put(self, id_equipo):
        try:
            equipo = Equipo.query.get(id_equipo)
            if not equipo:
                equipo_ns.abort(404, error='Equipo no encontrado')

            data = equipo_ns.payload

            if 'nombre' in data:
                existe = Equipo.query.filter_by(nombre=data['nombre']).first()
                if existe and existe.id_equipo != id_equipo:
                    equipo_ns.abort(400, error='Ya existe un equipo con este nombre')
                equipo.nombre = data['nombre']

            if 'logo_url' in data:
                equipo.logo_url = data['logo_url']
            if 'estadio' in data:
                equipo.estadio = data['estadio']
            if 'tipo_deporte' in data:
                equipo.tipo_deporte = data['tipo_deporte']
            if 'max_jugadores' in data:
                equipo.max_jugadores = data['max_jugadores']

            db.session.commit()
            return equipo.to_dict(), 200

        except Exception as e:
            db.session.rollback()
            equipo_ns.abort(500, error=str(e))

    @equipo_ns.doc(description='Eliminar equipo (solo admin)', security='Bearer')
    @equipo_ns.marshal_with(message_response, code=200)
    @jwt_required()
    @role_required(['admin'])
    def delete(self, id_equipo):
        try:
            equipo = Equipo.query.get(id_equipo)
            if not equipo:
                equipo_ns.abort(404, error='Equipo no encontrado')

            if equipo.jugadores.count() > 0:
                equipo_ns.abort(400, error='No se puede eliminar un equipo con jugadores registrados')

            db.session.delete(equipo)
            db.session.commit()

            return {'mensaje': 'Equipo eliminado exitosamente'}, 200

        except Exception as e:
            db.session.rollback()
            equipo_ns.abort(500, error=str(e))


@equipo_ns.route('/<int:id_equipo>/estado')
@equipo_ns.param('id_equipo', 'ID del equipo')
class EquipoEstado(Resource):
    @equipo_ns.doc(description='Cambiar estado del equipo (solo admin)', security='Bearer')
    @equipo_ns.expect(equipo_estado_model, validate=True)
    @equipo_ns.marshal_with(equipo_output_model, code=200, envelope='equipo')
    @jwt_required()
    @role_required(['admin'])
    def patch(self, id_equipo):
        try:
            equipo = Equipo.query.get(id_equipo)
            if not equipo:
                equipo_ns.abort(404, error='Equipo no encontrado')

            data = equipo_ns.payload
            current_user_id = get_jwt_identity()

            estados_validos = ['pendiente', 'aprobado', 'rechazado']
            if data['estado'] not in estados_validos:
                equipo_ns.abort(400, error=f'Estado no válido. Debe ser: {", ".join(estados_validos)}')

            # Registrar historial
            historial = HistorialEstado(
                tipo_entidad='equipo',
                id_entidad=id_equipo,
                estado_anterior=equipo.estado,
                estado_nuevo=data['estado'],
                cambiado_por=int(current_user_id),
                observaciones=data.get('observaciones')
            )
            db.session.add(historial)

            equipo.estado = data['estado']
            equipo.aprobado_por = int(current_user_id)
            equipo.fecha_aprobacion = datetime.utcnow()

            if 'observaciones' in data:
                equipo.observaciones = data['observaciones']

            db.session.commit()

            return equipo.to_dict(), 200

        except Exception as e:
            db.session.rollback()
            equipo_ns.abort(500, error=str(e))


@equipo_ns.route('/mis-equipos')
class MisEquipos(Resource):
    @equipo_ns.doc(description='Obtener equipos del usuario autenticado', security='Bearer')
    @equipo_ns.marshal_list_with(equipo_output_model, code=200, envelope='equipos')
    @jwt_required()
    @role_required(['lider', 'admin'])
    def get(self):
        try:
            current_user_id = get_jwt_identity()
            equipos = Equipo.query.filter_by(id_lider=int(current_user_id)).all()
            return [e.to_dict() for e in equipos], 200
        except Exception as e:
            equipo_ns.abort(500, error=str(e))


@equipo_ns.route('/<int:id_equipo>/historial')
@equipo_ns.param('id_equipo', 'ID del equipo')
class EquipoHistorial(Resource):
    @equipo_ns.doc(description='Obtener historial de cambios de estado del equipo')
    def get(self, id_equipo):
        try:
            equipo = Equipo.query.get(id_equipo)
            if not equipo:
                equipo_ns.abort(404, error='Equipo no encontrado')

            historial = HistorialEstado.query.filter_by(
                tipo_entidad='equipo',
                id_entidad=id_equipo
            ).order_by(HistorialEstado.fecha_cambio.desc()).all()

            return {
                'equipo': equipo.nombre,
                'total_cambios': len(historial),
                'historial': [h.to_dict() for h in historial]
            }, 200

        except Exception as e:
            equipo_ns.abort(500, error=str(e))
