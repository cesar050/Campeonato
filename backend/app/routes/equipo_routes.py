from flask import request
from flask_restx import Namespace, fields, Resource
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.middlewares.auth_middleware import role_required
from app.extensions import db
from app.models.equipo import Equipo
from app.models.usuario import Usuario
from datetime import datetime

equipo_ns = Namespace('equipos', description='Gestión de equipos de fútbol')

# ============================================
# MODELOS PARA DOCUMENTACIÓN SWAGGER
# ============================================

equipo_input_model = equipo_ns.model('EquipoInput', {
    'nombre': fields.String(required=True, description='Nombre del equipo', example='Barcelona FC'),
    'nombre_lider': fields.String(required=True, description='Nombre del líder del equipo', example='Juan Pérez'),
    'estadio': fields.String(required=True, description='Nombre del estadio', example='Camp Nou'),
    'logo_url': fields.String(description='URL del logo del equipo')
})

equipo_update_model = equipo_ns.model('EquipoUpdate', {
    'nombre': fields.String(description='Nombre del equipo'),
    'estadio': fields.String(description='Nombre del estadio'),
    'logo_url': fields.String(description='URL del logo del equipo')
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
    'estado': fields.String(description='Estado del equipo', enum=['pendiente', 'aprobado', 'rechazado']),
    'fecha_registro': fields.DateTime(description='Fecha de registro'),
    'fecha_aprobacion': fields.DateTime(description='Fecha de aprobación'),
    'observaciones': fields.String(description='Observaciones'),
    'lider': fields.Nested(lider_model, description='Datos del líder')
})

message_response = equipo_ns.model('MessageResponse', {
    'mensaje': fields.String(description='Mensaje de respuesta')
})

error_response = equipo_ns.model('ErrorResponse', {
    'error': fields.String(description='Mensaje de error'),
    'mensaje': fields.String(description='Mensaje descriptivo adicional')
})


# ============================================
# ENDPOINTS
# ============================================

@equipo_ns.route('')
class EquipoList(Resource):
    @equipo_ns.doc(
        description='Listar todos los equipos con filtros opcionales',
        params={
            'estado': 'Filtrar por estado (pendiente, aprobado, rechazado)',
            'id_lider': 'Filtrar por ID del líder'
        },
        responses={
            200: 'Lista de equipos',
            500: 'Error interno del servidor'
        }
    )
    @equipo_ns.marshal_list_with(equipo_output_model, code=200, envelope='equipos')
    def get(self):
        """
        Listar todos los equipos
        
        Puede filtrar por estado o id_lider usando query params
        """
        try:
            estado = request.args.get('estado')
            id_lider = request.args.get('id_lider')
            
            query = Equipo.query
            if estado:
                query = query.filter_by(estado=estado)
            if id_lider:
                query = query.filter_by(id_lider=int(id_lider))
            
            equipos = query.order_by(Equipo.fecha_registro.desc()).all()
            return equipos, 200
            
        except Exception as e:
            equipo_ns.abort(500, error=str(e))
    
    @equipo_ns.doc(
        description='Crear nuevo equipo (requiere autenticación y rol líder o admin)',
        security='Bearer',
        responses={
            201: 'Equipo creado exitosamente',
            400: 'Datos inválidos o equipo ya existe',
            401: 'No autorizado',
            403: 'Permisos insuficientes',
            404: 'Líder no encontrado',
            500: 'Error interno del servidor'
        }
    )
    @equipo_ns.expect(equipo_input_model, validate=True)
    @equipo_ns.marshal_with(equipo_output_model, code=201, envelope='equipo')
    @jwt_required()
    @role_required(['admin', 'lider'])
    def post(self):
        """
        Crear equipo usando NOMBRE del líder
        
        El sistema buscará al líder por nombre y lo asignará automáticamente
        """
        try:
            data = equipo_ns.payload
            
            # Validaciones básicas
            if not data.get('nombre'):
                equipo_ns.abort(400, error='El nombre del equipo es obligatorio')
            
            if not data.get('nombre_lider'):
                equipo_ns.abort(400, error='El nombre del líder es obligatorio')
            
            if not data.get('estadio'):
                equipo_ns.abort(400, error='El estadio es obligatorio')
            
            # Buscar líder por nombre
            lider = Usuario.query.filter(
                Usuario.nombre.ilike(f"%{data['nombre_lider']}%")
            ).first()
            
            if not lider:
                equipo_ns.abort(404, error='Líder no encontrado', mensaje=f'No existe un usuario con el nombre "{data["nombre_lider"]}"')
            
            # Verificar que sea líder o admin
            if lider.rol not in ['lider', 'admin']:
                equipo_ns.abort(400, error='El usuario debe tener rol de líder o admin')
            
            # Verificar si el equipo ya existe
            equipo_existente = Equipo.query.filter_by(nombre=data['nombre']).first()
            if equipo_existente:
                equipo_ns.abort(400, error='Ya existe un equipo con este nombre')
            
            # Crear equipo
            nuevo_equipo = Equipo(
                nombre=data['nombre'],
                logo_url=data.get('logo_url'),
                estadio=data['estadio'],
                id_lider=lider.id_usuario,
                estado='pendiente'
            )
            
            db.session.add(nuevo_equipo)
            db.session.commit()
            
            return nuevo_equipo, 201
            
        except Exception as e:
            db.session.rollback()
            equipo_ns.abort(500, error=str(e))


@equipo_ns.route('/<int:id_equipo>')
@equipo_ns.param('id_equipo', 'ID del equipo')
class EquipoDetail(Resource):
    @equipo_ns.doc(
        description='Obtener detalles de un equipo específico',
        responses={
            200: 'Equipo encontrado',
            404: 'Equipo no encontrado',
            500: 'Error interno del servidor'
        }
    )
    @equipo_ns.marshal_with(equipo_output_model, code=200, envelope='equipo')
    def get(self, id_equipo):
        """
        Obtener equipo por ID
        """
        try:
            equipo = Equipo.query.get(id_equipo)
            if not equipo:
                equipo_ns.abort(404, error='Equipo no encontrado')
            return equipo, 200
            
        except Exception as e:
            equipo_ns.abort(500, error=str(e))
    
    @equipo_ns.doc(
        description='Actualizar datos de un equipo (requiere autenticación y rol líder o admin)',
        security='Bearer',
        responses={
            200: 'Equipo actualizado',
            400: 'Nombre duplicado',
            401: 'No autorizado',
            403: 'Permisos insuficientes',
            404: 'Equipo no encontrado',
            500: 'Error interno del servidor'
        }
    )
    @equipo_ns.expect(equipo_update_model, validate=True)
    @equipo_ns.marshal_with(equipo_output_model, code=200, envelope='equipo')
    @jwt_required()
    @role_required(['admin', 'lider'])
    def put(self, id_equipo):
        """
        Actualizar equipo
        """
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
            
            db.session.commit()
            return equipo, 200
            
        except Exception as e:
            db.session.rollback()
            equipo_ns.abort(500, error=str(e))
    
    @equipo_ns.doc(
        description='Eliminar un equipo (solo admin, no puede tener jugadores)',
        security='Bearer',
        responses={
            200: 'Equipo eliminado',
            400: 'El equipo tiene jugadores',
            401: 'No autorizado',
            403: 'Permisos insuficientes',
            404: 'Equipo no encontrado',
            500: 'Error interno del servidor'
        }
    )
    @equipo_ns.marshal_with(message_response, code=200)
    @jwt_required()
    @role_required(['admin'])
    def delete(self, id_equipo):
        """
        Eliminar equipo (solo si no tiene jugadores)
        """
        try:
            equipo = Equipo.query.get(id_equipo)
            if not equipo:
                equipo_ns.abort(404, error='Equipo no encontrado')
            
            # Verificar si tiene jugadores
            if equipo.jugadores.count() > 0:
                equipo_ns.abort(400, error='No se puede eliminar un equipo que tiene jugadores registrados')
            
            db.session.delete(equipo)
            db.session.commit()
            
            return {'mensaje': 'Equipo eliminado exitosamente'}, 200
            
        except Exception as e:
            db.session.rollback()
            equipo_ns.abort(500, error=str(e))


@equipo_ns.route('/<int:id_equipo>/estado')
@equipo_ns.param('id_equipo', 'ID del equipo')
class EquipoEstado(Resource):
    @equipo_ns.doc(
        description='Cambiar estado del equipo (solo admin): aprobar, rechazar o dejar pendiente',
        security='Bearer',
        responses={
            200: 'Estado cambiado exitosamente',
            400: 'Estado no válido',
            401: 'No autorizado',
            403: 'Permisos insuficientes - solo admin',
            404: 'Equipo no encontrado',
            500: 'Error interno del servidor'
        }
    )
    @equipo_ns.expect(equipo_estado_model, validate=True)
    @equipo_ns.marshal_with(equipo_output_model, code=200, envelope='equipo')
    @jwt_required()
    @role_required(['admin'])
    def patch(self, id_equipo):
        """
        Cambiar estado del equipo (aprobar/rechazar)
        
        Solo administradores pueden cambiar el estado
        """
        try:
            equipo = Equipo.query.get(id_equipo)
            if not equipo:
                equipo_ns.abort(404, error='Equipo no encontrado')
            
            data = equipo_ns.payload
            
            if 'estado' not in data:
                equipo_ns.abort(400, error='El campo estado es requerido')
            
            estados_validos = ['pendiente', 'aprobado', 'rechazado']
            if data['estado'] not in estados_validos:
                equipo_ns.abort(400, error=f'Estado no válido. Debe ser uno de: {", ".join(estados_validos)}')
            
            current_user_id = get_jwt_identity()
            
            equipo.estado = data['estado']
            equipo.aprobado_por = int(current_user_id)
            equipo.fecha_aprobacion = datetime.utcnow()
            
            if 'observaciones' in data:
                equipo.observaciones = data['observaciones']
            
            db.session.commit()
            
            return equipo, 200
            
        except Exception as e:
            db.session.rollback()
            equipo_ns.abort(500, error=str(e))


@equipo_ns.route('/mis-equipos')
class MisEquipos(Resource):
    @equipo_ns.doc(
        description='Obtener equipos del usuario autenticado (solo líder o admin)',
        security='Bearer',
        responses={
            200: 'Lista de equipos del usuario',
            401: 'No autorizado',
            403: 'Permisos insuficientes',
            500: 'Error interno del servidor'
        }
    )
    @equipo_ns.marshal_list_with(equipo_output_model, code=200, envelope='equipos')
    @jwt_required()
    @role_required(['lider', 'admin'])
    def get(self):
        """
        Obtener mis equipos
        
        Retorna los equipos donde el usuario autenticado es líder
        """
        try:
            current_user_id = get_jwt_identity()
            equipos = Equipo.query.filter_by(id_lider=int(current_user_id)).all()
            return equipos, 200
            
        except Exception as e:
            equipo_ns.abort(500, error=str(e))