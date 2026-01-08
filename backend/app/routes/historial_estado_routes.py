from flask import request
from flask_restx import Namespace, fields, Resource
from flask_jwt_extended import jwt_required
from app.middlewares.auth_middleware import role_required
from app.extensions import db
from app.models.historial_estado import HistorialEstado
from app.models.usuario import Usuario

historial_ns = Namespace('historial', description='Gestión de historial de cambios de estado')

# ============================================
# MODELOS SWAGGER
# ============================================

historial_output_model = historial_ns.model('HistorialOutput', {
    'id': fields.Integer(description='ID del registro'),
    'tipo_entidad': fields.String(description='Tipo de entidad', enum=['campeonato', 'equipo', 'partido', 'inscripcion']),
    'id_entidad': fields.Integer(description='ID de la entidad'),
    'estado_anterior': fields.String(description='Estado anterior'),
    'estado_nuevo': fields.String(description='Estado nuevo'),
    'cambiado_por': fields.Integer(description='ID del usuario que realizó el cambio'),
    'nombre_usuario': fields.String(description='Nombre del usuario'),
    'fecha_cambio': fields.DateTime(description='Fecha del cambio'),
    'observaciones': fields.String(description='Observaciones')
})

# ============================================
# ENDPOINTS
# ============================================

@historial_ns.route('')
class HistorialList(Resource):
    @historial_ns.doc(
        description='Listar historial de cambios con filtros',
        params={
            'tipo_entidad': 'Filtrar por tipo (campeonato, equipo, partido, inscripcion)',
            'id_entidad': 'Filtrar por ID de la entidad específica',
            'cambiado_por': 'Filtrar por ID del usuario que hizo el cambio',
            'fecha_desde': 'Filtrar desde fecha (YYYY-MM-DD)',
            'fecha_hasta': 'Filtrar hasta fecha (YYYY-MM-DD)',
            'buscar': 'Buscar en observaciones',
            'ordenar_por': 'Ordenar por (fecha_cambio)',
            'orden': 'Orden (asc, desc)',
            'limit': 'Límite de resultados (default: 50, max: 200)'
        }
    )
    @historial_ns.marshal_list_with(historial_output_model, code=200, envelope='historial')
    def get(self):
        try:
            # Filtros
            tipo_entidad = request.args.get('tipo_entidad')
            id_entidad = request.args.get('id_entidad')
            cambiado_por = request.args.get('cambiado_por')
            fecha_desde = request.args.get('fecha_desde')
            fecha_hasta = request.args.get('fecha_hasta')
            buscar = request.args.get('buscar')
            
            # Ordenación y límite
            ordenar_por = request.args.get('ordenar_por', 'fecha_cambio')
            orden = request.args.get('orden', 'desc')
            limit = int(request.args.get('limit', 50))
            limit = min(limit, 200)  # Máximo 200 registros

            query = HistorialEstado.query

            # Aplicar filtros
            if tipo_entidad:
                tipos_validos = ['campeonato', 'equipo', 'partido', 'inscripcion']
                if tipo_entidad not in tipos_validos:
                    historial_ns.abort(400, error=f'Tipo no válido. Debe ser: {", ".join(tipos_validos)}')
                query = query.filter_by(tipo_entidad=tipo_entidad)
            
            if id_entidad:
                query = query.filter_by(id_entidad=int(id_entidad))
            
            if cambiado_por:
                query = query.filter_by(cambiado_por=int(cambiado_por))
            
            if fecha_desde:
                from datetime import datetime
                fecha = datetime.strptime(fecha_desde, '%Y-%m-%d')
                query = query.filter(HistorialEstado.fecha_cambio >= fecha)
            
            if fecha_hasta:
                from datetime import datetime
                fecha = datetime.strptime(fecha_hasta, '%Y-%m-%d')
                query = query.filter(HistorialEstado.fecha_cambio <= fecha)
            
            if buscar:
                query = query.filter(HistorialEstado.observaciones.ilike(f'%{buscar}%'))

            # Ordenar
            if orden == 'asc':
                query = query.order_by(HistorialEstado.fecha_cambio.asc())
            else:
                query = query.order_by(HistorialEstado.fecha_cambio.desc())

            # Limitar resultados
            registros = query.limit(limit).all()

            return [r.to_dict() for r in registros], 200

        except Exception as e:
            historial_ns.abort(500, error=str(e))


@historial_ns.route('/<int:id_historial>')
@historial_ns.param('id_historial', 'ID del registro de historial')
class HistorialDetail(Resource):
    @historial_ns.doc(description='Obtener detalles de un registro específico')
    @historial_ns.marshal_with(historial_output_model, code=200, envelope='registro')
    def get(self, id_historial):
        try:
            registro = HistorialEstado.query.get(id_historial)
            if not registro:
                historial_ns.abort(404, error='Registro no encontrado')
            return registro.to_dict(), 200
        except Exception as e:
            historial_ns.abort(500, error=str(e))


@historial_ns.route('/entidad/<string:tipo>/<int:id_entidad>')
@historial_ns.param('tipo', 'Tipo de entidad (campeonato, equipo, partido, inscripcion)')
@historial_ns.param('id_entidad', 'ID de la entidad')
class HistorialPorEntidad(Resource):
    @historial_ns.doc(description='Obtener historial completo de una entidad específica')
    @historial_ns.marshal_list_with(historial_output_model, code=200, envelope='historial')
    def get(self, tipo, id_entidad):
        try:
            tipos_validos = ['campeonato', 'equipo', 'partido', 'inscripcion']
            if tipo not in tipos_validos:
                historial_ns.abort(400, error=f'Tipo no válido. Debe ser: {", ".join(tipos_validos)}')

            registros = HistorialEstado.query.filter_by(
                tipo_entidad=tipo,
                id_entidad=id_entidad
            ).order_by(HistorialEstado.fecha_cambio.desc()).all()

            return [r.to_dict() for r in registros], 200

        except Exception as e:
            historial_ns.abort(500, error=str(e))


@historial_ns.route('/usuario/<int:id_usuario>')
@historial_ns.param('id_usuario', 'ID del usuario')
class HistorialPorUsuario(Resource):
    @historial_ns.doc(description='Obtener todos los cambios realizados por un usuario')
    @historial_ns.marshal_list_with(historial_output_model, code=200, envelope='historial')
    def get(self, id_usuario):
        try:
            usuario = Usuario.query.get(id_usuario)
            if not usuario:
                historial_ns.abort(404, error='Usuario no encontrado')

            registros = HistorialEstado.query.filter_by(
                cambiado_por=id_usuario
            ).order_by(HistorialEstado.fecha_cambio.desc()).all()

            return {
                'usuario': usuario.nombre,
                'total_cambios': len(registros),
                'historial': [r.to_dict() for r in registros]
            }, 200

        except Exception as e:
            historial_ns.abort(500, error=str(e))


@historial_ns.route('/estadisticas')
class HistorialEstadisticas(Resource):
    @historial_ns.doc(description='Obtener estadísticas del historial')
    def get(self):
        try:
            total_registros = HistorialEstado.query.count()
            
            por_tipo = db.session.query(
                HistorialEstado.tipo_entidad,
                db.func.count(HistorialEstado.id).label('total')
            ).group_by(HistorialEstado.tipo_entidad).all()

            usuarios_activos = db.session.query(
                Usuario.nombre,
                db.func.count(HistorialEstado.id).label('total_cambios')
            ).join(
                HistorialEstado, HistorialEstado.cambiado_por == Usuario.id_usuario
            ).group_by(Usuario.nombre).order_by(db.desc('total_cambios')).limit(10).all()

            return {
                'total_registros': total_registros,
                'por_tipo_entidad': [{'tipo': t[0], 'total': t[1]} for t in por_tipo],
                'usuarios_mas_activos': [{'usuario': u[0], 'total_cambios': u[1]} for u in usuarios_activos]
            }, 200

        except Exception as e:
            historial_ns.abort(500, error=str(e))

