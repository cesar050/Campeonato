from flask import request
from flask_restx import Namespace, fields, Resource
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.middlewares.auth_middleware import role_required
from app.extensions import db
from app.models.campeonato_equipo import CampeonatoEquipo
from app.models.campeonato import Campeonato
from app.models.equipo import Equipo
from app.models.historial_estado import HistorialEstado
from datetime import datetime

inscripcion_ns = Namespace('inscripciones', description='Gestión de inscripciones de equipos en campeonatos')

# ============================================
# MODELOS SWAGGER
# ============================================

inscripcion_input_model = inscripcion_ns.model('InscripcionInput', {
    'id_campeonato': fields.Integer(required=True, description='ID del campeonato', example=1),
    'id_equipo': fields.Integer(required=True, description='ID del equipo', example=1)
})

inscripcion_estado_model = inscripcion_ns.model('InscripcionEstado', {
    'estado_inscripcion': fields.String(required=True, description='Estado de la inscripción', enum=['pendiente', 'aprobado', 'rechazado']),
    'observaciones': fields.String(description='Observaciones del cambio de estado')
})

inscripcion_output_model = inscripcion_ns.model('InscripcionOutput', {
    'id': fields.Integer(description='ID de la inscripción'),
    'id_campeonato': fields.Integer(description='ID del campeonato'),
    'id_equipo': fields.Integer(description='ID del equipo'),
    'fecha_inscripcion': fields.DateTime(description='Fecha de inscripción'),
    'estado_inscripcion': fields.String(description='Estado de la inscripción'),
    'observaciones': fields.String(description='Observaciones'),
    'nombre_grupo': fields.String(description='Grupo asignado (A, B, C...)'),
    'numero_sorteo': fields.Integer(description='Número de sorteo')
})

message_response = inscripcion_ns.model('MessageResponse', {
    'mensaje': fields.String(description='Mensaje de respuesta')
})

# ============================================
# ENDPOINTS
# ============================================

@inscripcion_ns.route('')
class InscripcionList(Resource):
    @inscripcion_ns.doc(
        description='Inscribir equipo en campeonato (líder o admin)',
        security='Bearer',
        responses={
            201: 'Inscripción creada',
            400: 'Datos inválidos o límite alcanzado',
            401: 'No autorizado',
            404: 'Campeonato o equipo no encontrado'
        }
    )
    @inscripcion_ns.expect(inscripcion_input_model, validate=True)
    @inscripcion_ns.marshal_with(inscripcion_output_model, code=201, envelope='inscripcion')
    @jwt_required()
    @role_required(['admin', 'lider'])
    def post(self):
        try:
            data = inscripcion_ns.payload

            # Validar campeonato
            campeonato = Campeonato.query.get(data['id_campeonato'])
            if not campeonato:
                inscripcion_ns.abort(404, error='Campeonato no encontrado')

            if not campeonato.inscripciones_abiertas:
                inscripcion_ns.abort(400, error='Las inscripciones están cerradas para este campeonato')

            # Validar equipo
            equipo = Equipo.query.get(data['id_equipo'])
            if not equipo:
                inscripcion_ns.abort(404, error='Equipo no encontrado')

            if equipo.estado != 'aprobado':
                inscripcion_ns.abort(400, error='El equipo debe estar aprobado para inscribirse')

            # Verificar que no esté ya inscrito
            inscripcion_existente = CampeonatoEquipo.query.filter_by(
                id_campeonato=data['id_campeonato'],
                id_equipo=data['id_equipo']
            ).first()

            if inscripcion_existente:
                inscripcion_ns.abort(400, error='El equipo ya está inscrito en este campeonato')

            # Verificar límite de equipos
            total_aprobados = campeonato.equipos_inscritos.filter_by(estado_inscripcion='aprobado').count()
            if total_aprobados >= campeonato.max_equipos:
                inscripcion_ns.abort(400, error=f'Se alcanzó el máximo de equipos permitidos ({campeonato.max_equipos})')

            # Crear inscripción
            nueva_inscripcion = CampeonatoEquipo(
                id_campeonato=data['id_campeonato'],
                id_equipo=data['id_equipo'],
                estado_inscripcion='pendiente'
            )

            db.session.add(nueva_inscripcion)
            db.session.commit()

            return nueva_inscripcion.to_dict(), 201

        except Exception as e:
            db.session.rollback()
            inscripcion_ns.abort(500, error=str(e))

    @inscripcion_ns.doc(
        description='Listar todas las inscripciones con filtros',
        params={
            'id_campeonato': 'Filtrar por ID del campeonato',
            'id_equipo': 'Filtrar por ID del equipo',
            'estado': 'Filtrar por estado (pendiente, aprobado, rechazado)',
            'nombre_grupo': 'Filtrar por grupo (A, B, C...)',
            'buscar': 'Buscar por nombre de equipo o campeonato',
            'ordenar_por': 'Ordenar por (fecha_inscripcion, nombre_grupo)',
            'orden': 'Orden (asc, desc)'
        }
    )
    @inscripcion_ns.marshal_list_with(inscripcion_output_model, code=200, envelope='inscripciones')
    def get(self):
        try:
            # Filtros
            id_campeonato = request.args.get('id_campeonato')
            id_equipo = request.args.get('id_equipo')
            estado = request.args.get('estado')
            nombre_grupo = request.args.get('nombre_grupo')
            buscar = request.args.get('buscar')
            
            # Ordenación
            ordenar_por = request.args.get('ordenar_por', 'fecha_inscripcion')
            orden = request.args.get('orden', 'desc')

            query = CampeonatoEquipo.query

            # Aplicar filtros
            if id_campeonato:
                query = query.filter_by(id_campeonato=int(id_campeonato))
            if id_equipo:
                query = query.filter_by(id_equipo=int(id_equipo))
            if estado:
                query = query.filter_by(estado_inscripcion=estado)
            if nombre_grupo:
                query = query.filter_by(nombre_grupo=nombre_grupo.upper())
            if buscar:
                query = query.join(Equipo).join(Campeonato).filter(
                    db.or_(
                        Equipo.nombre.ilike(f'%{buscar}%'),
                        Campeonato.nombre.ilike(f'%{buscar}%')
                    )
                )

            # Ordenar
            if ordenar_por == 'nombre_grupo':
                query = query.order_by(CampeonatoEquipo.nombre_grupo.desc() if orden == 'desc' else CampeonatoEquipo.nombre_grupo.asc())
            else:
                query = query.order_by(CampeonatoEquipo.fecha_inscripcion.desc() if orden == 'desc' else CampeonatoEquipo.fecha_inscripcion.asc())

            inscripciones = query.all()
            return [i.to_dict() for i in inscripciones], 200

        except Exception as e:
            inscripcion_ns.abort(500, error=str(e))


@inscripcion_ns.route('/<int:id_inscripcion>')
@inscripcion_ns.param('id_inscripcion', 'ID de la inscripción')
class InscripcionDetail(Resource):
    @inscripcion_ns.doc(description='Obtener detalles de una inscripción específica')
    @inscripcion_ns.marshal_with(inscripcion_output_model, code=200, envelope='inscripcion')
    def get(self, id_inscripcion):
        try:
            inscripcion = CampeonatoEquipo.query.get(id_inscripcion)
            if not inscripcion:
                inscripcion_ns.abort(404, error='Inscripción no encontrada')
            return inscripcion.to_dict(), 200
        except Exception as e:
            inscripcion_ns.abort(500, error=str(e))

    @inscripcion_ns.doc(description='Eliminar inscripción (solo admin)', security='Bearer')
    @inscripcion_ns.marshal_with(message_response, code=200)
    @jwt_required()
    @role_required(['admin'])
    def delete(self, id_inscripcion):
        try:
            inscripcion = CampeonatoEquipo.query.get(id_inscripcion)
            if not inscripcion:
                inscripcion_ns.abort(404, error='Inscripción no encontrada')

            db.session.delete(inscripcion)
            db.session.commit()

            return {'mensaje': 'Inscripción eliminada exitosamente'}, 200

        except Exception as e:
            db.session.rollback()
            inscripcion_ns.abort(500, error=str(e))


@inscripcion_ns.route('/<int:id_inscripcion>/estado')
@inscripcion_ns.param('id_inscripcion', 'ID de la inscripción')
class InscripcionEstado(Resource):
    @inscripcion_ns.doc(description='Cambiar estado de inscripción (solo admin)', security='Bearer')
    @inscripcion_ns.expect(inscripcion_estado_model, validate=True)
    @inscripcion_ns.marshal_with(inscripcion_output_model, code=200, envelope='inscripcion')
    @jwt_required()
    @role_required(['admin', 'superadmin'])  # ← CAMBIAR ESTA LÍNEA (agregar 'superadmin')
    def patch(self, id_inscripcion):
        try:
            inscripcion = CampeonatoEquipo.query.get(id_inscripcion)
            if not inscripcion:
                inscripcion_ns.abort(404, error='Inscripción no encontrada')

            data = inscripcion_ns.payload
            current_user_id = get_jwt_identity()

            estados_validos = ['pendiente', 'aprobado', 'rechazado']
            if data['estado_inscripcion'] not in estados_validos:
                inscripcion_ns.abort(400, error=f'Estado no válido. Debe ser: {", ".join(estados_validos)}')

            # Registrar historial
            historial = HistorialEstado(
                tipo_entidad='inscripcion',
                id_entidad=id_inscripcion,
                estado_anterior=inscripcion.estado_inscripcion,
                estado_nuevo=data['estado_inscripcion'],
                cambiado_por=int(current_user_id),
                observaciones=data.get('observaciones')
            )
            db.session.add(historial)

            # Actualizar estado
            estado_anterior = inscripcion.estado_inscripcion
            inscripcion.estado_inscripcion = data['estado_inscripcion']
            if 'observaciones' in data:
                inscripcion.observaciones = data['observaciones']

            # ✅ AGREGAR: Crear notificación para el líder
            from app.models.notificacion import Notificacion
            equipo = inscripcion.equipo
            
            if equipo:
                # Obtener campeonato
                campeonato = Campeonato.query.get(inscripcion.id_campeonato)
                
                # Mensajes según estado
                mensaje_tipo = {
                    'aprobado': f'¡Tu equipo "{equipo.nombre}" ha sido APROBADO para "{campeonato.nombre}"!',
                    'rechazado': f'Tu solicitud para "{campeonato.nombre}" fue rechazada. Motivo: {data.get("observaciones", "No especificado")}',
                    'pendiente': f'Tu solicitud para "{campeonato.nombre}" está en revisión.'
                }

                notificacion = Notificacion(
                    id_usuario=equipo.id_lider,
                    titulo=f'Inscripción {data["estado_inscripcion"]}',
                    mensaje=mensaje_tipo.get(data['estado_inscripcion'], ''),
                    tipo='success' if data['estado_inscripcion'] == 'aprobado' else ('error' if data['estado_inscripcion'] == 'rechazado' else 'info'),
                    id_campeonato=inscripcion.id_campeonato,
                    id_equipo=inscripcion.id_equipo
                )
                db.session.add(notificacion)

            db.session.commit()

            print(f"✅ Inscripción #{id_inscripcion} cambiada de '{estado_anterior}' a '{data['estado_inscripcion']}'")
            return inscripcion.to_dict(), 200

        except Exception as e:
            db.session.rollback()
            print(f"❌ Error al cambiar estado: {str(e)}")
            inscripcion_ns.abort(500, error=str(e))


@inscripcion_ns.route('/campeonato/<int:id_campeonato>')
@inscripcion_ns.param('id_campeonato', 'ID del campeonato')
class InscripcionesPorCampeonato(Resource):
    @inscripcion_ns.doc(
        description='Obtener todas las inscripciones de un campeonato con información de equipos',
        params={'estado': 'Filtrar por estado (pendiente, aprobado, rechazado)'}
    )
    def get(self, id_campeonato):
        try:
            campeonato = Campeonato.query.get(id_campeonato)
            if not campeonato:
                inscripcion_ns.abort(404, error='Campeonato no encontrado')

            estado = request.args.get('estado')
            query = CampeonatoEquipo.query.filter_by(id_campeonato=id_campeonato)

            if estado:
                query = query.filter_by(estado_inscripcion=estado)

            inscripciones = query.order_by(CampeonatoEquipo.fecha_inscripcion.desc()).all()

            return {
                'campeonato': campeonato.nombre,
                'max_equipos': campeonato.max_equipos,
                'total_inscripciones': len(inscripciones),
                'total_aprobados': len([i for i in inscripciones if i.estado_inscripcion == 'aprobado']),
                'total_pendientes': len([i for i in inscripciones if i.estado_inscripcion == 'pendiente']),
                'inscripciones': [i.to_dict(include_equipo=True) for i in inscripciones]  # ← IMPORTANTE
            }, 200

        except Exception as e:
            print(f"❌ Error al obtener inscripciones: {str(e)}")
            inscripcion_ns.abort(500, error=str(e))

@inscripcion_ns.route('/equipo/<int:id_equipo>')
@inscripcion_ns.param('id_equipo', 'ID del equipo')
class InscripcionesPorEquipo(Resource):
    @inscripcion_ns.doc(description='Obtener todas las inscripciones de un equipo')
    def get(self, id_equipo):
        try:
            equipo = Equipo.query.get(id_equipo)
            if not equipo:
                inscripcion_ns.abort(404, error='Equipo no encontrado')

            inscripciones = CampeonatoEquipo.query.filter_by(id_equipo=id_equipo).order_by(
                CampeonatoEquipo.fecha_inscripcion.desc()
            ).all()

            return {
                'equipo': equipo.nombre,
                'total_inscripciones': len(inscripciones),
                'inscripciones': [i.to_dict() for i in inscripciones]
            }, 200

        except Exception as e:
            inscripcion_ns.abort(500, error=str(e))