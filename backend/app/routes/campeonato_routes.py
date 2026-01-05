from flask import request
from flask_restx import Namespace, fields, Resource
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.middlewares.auth_middleware import role_required
from app.extensions import db
from app.models.campeonato import Campeonato
from app.models.campeonato_equipo import CampeonatoEquipo
from app.models.equipo import Equipo
from app.models.partido import Partido
from app.models.historial_estado import HistorialEstado
from itertools import combinations
from datetime import datetime, timedelta
import random
import string

campeonato_ns = Namespace('campeonatos', description='Gestión de campeonatos de fútbol')

# ============================================
# MODELOS SWAGGER
# ============================================

campeonato_input_model = campeonato_ns.model('CampeonatoInput', {
    'nombre': fields.String(required=True, description='Nombre del campeonato', example='Liga Profesional 2024'),
    'descripcion': fields.String(description='Descripción del campeonato'),
    'max_equipos': fields.Integer(description='Máximo número de equipos', example=16),
    'tipo_deporte': fields.String(description='Tipo de deporte', enum=['futbol', 'indoor'], example='futbol'),
    'tipo_competicion': fields.String(description='Tipo de competición', enum=['liga', 'eliminacion_directa', 'mixto'], example='liga'),
    'fecha_inicio': fields.Date(required=True, description='Fecha de inicio (YYYY-MM-DD)', example='2024-11-16'),
    'fecha_fin': fields.Date(required=True, description='Fecha de fin (YYYY-MM-DD)', example='2025-06-30'),
    'fecha_inicio_inscripciones': fields.Date(description='Fecha inicio inscripciones (YYYY-MM-DD)'),
    'fecha_cierre_inscripciones': fields.Date(description='Fecha cierre inscripciones (YYYY-MM-DD)'),
    'es_publico': fields.Boolean(description='Si el campeonato es público', example=True)
})

campeonato_update_model = campeonato_ns.model('CampeonatoUpdate', {
    'nombre': fields.String(description='Nombre del campeonato'),
    'descripcion': fields.String(description='Descripción del campeonato'),
    'max_equipos': fields.Integer(description='Máximo número de equipos'),
    'tipo_deporte': fields.String(description='Tipo de deporte', enum=['futbol', 'indoor']),
    'tipo_competicion': fields.String(description='Tipo de competición', enum=['liga', 'eliminacion_directa', 'mixto']),
    'fecha_inicio': fields.Date(description='Fecha de inicio (YYYY-MM-DD)'),
    'fecha_fin': fields.Date(description='Fecha de fin (YYYY-MM-DD)'),
    'fecha_inicio_inscripciones': fields.Date(description='Fecha inicio inscripciones (YYYY-MM-DD)'),
    'fecha_cierre_inscripciones': fields.Date(description='Fecha cierre inscripciones (YYYY-MM-DD)'),
    'inscripciones_abiertas': fields.Boolean(description='Inscripciones abiertas')
})

campeonato_estado_model = campeonato_ns.model('CampeonatoEstado', {
    'estado': fields.String(required=True, description='Estado del campeonato', enum=['planificacion', 'en_curso', 'finalizado']),
    'observaciones': fields.String(description='Observaciones del cambio')
})

generar_partidos_model = campeonato_ns.model('GenerarPartidos', {
    'fecha_inicio': fields.String(required=True, description='Fecha de inicio (YYYY-MM-DD)', example='2024-11-16'),
    'dias_entre_jornadas': fields.Integer(description='Días entre jornadas', example=7),
    'hora_inicio': fields.String(description='Hora del primer partido', example='15:00'),
    'hora_segundo_partido': fields.String(description='Hora del segundo partido', example='17:00'),
    'incluir_vuelta': fields.Boolean(description='Incluir partidos de vuelta', example=True)
})

inscripcion_input_model = campeonato_ns.model('InscripcionInput', {
    'id_equipo': fields.Integer(required=True, description='ID del equipo a inscribir', example=1)
})

inscripcion_estado_model = campeonato_ns.model('InscripcionEstado', {
    'estado_inscripcion': fields.String(required=True, description='Estado de la inscripción', enum=['pendiente', 'aprobado', 'rechazado']),
    'observaciones': fields.String(description='Observaciones')
})

sorteo_grupos_model = campeonato_ns.model('SorteoGrupos', {
    'numero_grupos': fields.Integer(required=True, description='Número de grupos (A, B, C...)', example=4, min=2, max=8)
})

campeonato_output_model = campeonato_ns.model('CampeonatoOutput', {
    'id_campeonato': fields.Integer(description='ID del campeonato'),
    'nombre': fields.String(description='Nombre del campeonato'),
    'descripcion': fields.String(description='Descripción'),
    'max_equipos': fields.Integer(description='Máximo de equipos'),
    'tipo_deporte': fields.String(description='Tipo de deporte'),
    'tipo_competicion': fields.String(description='Tipo de competición'),
    'fecha_inicio': fields.Date(description='Fecha de inicio'),
    'fecha_fin': fields.Date(description='Fecha de fin'),
    'fecha_inicio_inscripciones': fields.Date(description='Inicio de inscripciones'),
    'fecha_cierre_inscripciones': fields.Date(description='Cierre de inscripciones'),
    'inscripciones_abiertas': fields.Boolean(description='Inscripciones abiertas'),
    'estado': fields.String(description='Estado del campeonato'),
    'partidos_generados': fields.Boolean(description='Partidos generados'),
    'creado_por': fields.Integer(description='ID del creador'),
    'total_equipos_inscritos': fields.Integer(description='Total equipos inscritos'),
    'total_equipos_pendientes': fields.Integer(description='Total equipos pendientes')
})

message_response = campeonato_ns.model('MessageResponse', {
    'mensaje': fields.String(description='Mensaje de respuesta')
})

# ============================================
# ENDPOINTS
# ============================================

@campeonato_ns.route('')
class CampeonatoList(Resource):
    @campeonato_ns.doc(
        description='Crear nuevo campeonato (requiere rol admin)',
        security='Bearer',
        responses={201: 'Campeonato creado', 400: 'Datos inválidos', 401: 'No autorizado', 403: 'Sin permisos'}
    )
    @campeonato_ns.expect(campeonato_input_model, validate=True)
    @campeonato_ns.marshal_with(campeonato_output_model, code=201, envelope='campeonato')
    @jwt_required()
    @role_required(['admin'])
    def post(self):
        """Crear nuevo campeonato"""
        try:
            data = campeonato_ns.payload
            current_user_id = get_jwt_identity()

            # Validar nombre único
            if Campeonato.query.filter_by(nombre=data['nombre']).first():
                campeonato_ns.abort(400, error='Ya existe un campeonato con este nombre')

            # Validar fechas
            fecha_inicio = datetime.strptime(data['fecha_inicio'], '%Y-%m-%d').date()
            fecha_fin = datetime.strptime(data['fecha_fin'], '%Y-%m-%d').date()

            if fecha_fin <= fecha_inicio:
                campeonato_ns.abort(400, error='La fecha de fin debe ser posterior a la fecha de inicio')

            # ============================================
            # GENERAR CÓDIGO SI ES PRIVADO
            # ============================================
            es_publico = data.get('es_publico', False)
            codigo_inscripcion = None
            
            if not es_publico:
                # Solo generar código si es PRIVADO
                while True:
                    codigo_inscripcion = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
                    
                    # Verificar que no exista
                    existe = Campeonato.query.filter_by(codigo_inscripcion=codigo_inscripcion).first()
                    if not existe:
                        break

            # ============================================
            # CREAR CAMPEONATO
            # ============================================
            nuevo_campeonato = Campeonato(
                nombre=data['nombre'],
                descripcion=data.get('descripcion'),
                max_equipos=data.get('max_equipos', 16),
                tipo_deporte=data.get('tipo_deporte', 'futbol'),
                tipo_competicion=data.get('tipo_competicion', 'liga'),
                fecha_inicio=fecha_inicio,
                fecha_fin=fecha_fin,
                fecha_inicio_inscripciones=datetime.strptime(data['fecha_inicio_inscripciones'], '%Y-%m-%d').date() if data.get('fecha_inicio_inscripciones') else None,
                fecha_cierre_inscripciones=datetime.strptime(data['fecha_cierre_inscripciones'], '%Y-%m-%d').date() if data.get('fecha_cierre_inscripciones') else None,
                inscripciones_abiertas=True,
                codigo_inscripcion=codigo_inscripcion,
                es_publico=es_publico,
                creado_por=int(current_user_id),
                estado='planificacion'
            )

            db.session.add(nuevo_campeonato)
            db.session.commit()

            return nuevo_campeonato.to_dict(), 201

        except ValueError as e:
            db.session.rollback()
            campeonato_ns.abort(400, error=f'Formato de fecha inválido: {str(e)}')
        except Exception as e:
            db.session.rollback()
            print(f"❌ Error al crear campeonato: {str(e)}")
            campeonato_ns.abort(500, error=str(e))

    @campeonato_ns.doc(
        description='Listar campeonatos con filtros, búsqueda y ordenación',
        params={
            'estado': 'Filtrar por estado (planificacion, en_curso, finalizado)',
            'tipo_deporte': 'Filtrar por tipo de deporte (futbol, indoor)',
            'tipo_competicion': 'Filtrar por tipo (liga, eliminacion_directa, mixto)',
            'creado_por': 'Filtrar por ID del creador',
            'buscar': 'Buscar por nombre o descripción',
            'ordenar_por': 'Ordenar por campo (fecha_inicio, fecha_creacion, nombre)',
            'orden': 'Orden ascendente (asc) o descendente (desc)'
        }
    )
    @campeonato_ns.marshal_list_with(campeonato_output_model, code=200, envelope='campeonatos')
    def get(self):
        try:
            # Filtros
            estado = request.args.get('estado')
            tipo_deporte = request.args.get('tipo_deporte')
            tipo_competicion = request.args.get('tipo_competicion')
            creado_por = request.args.get('creado_por')
            buscar = request.args.get('buscar')
            
            # Ordenación
            ordenar_por = request.args.get('ordenar_por', 'fecha_creacion')
            orden = request.args.get('orden', 'desc')

            query = Campeonato.query

            # Aplicar filtros
            if estado:
                query = query.filter_by(estado=estado)
            if tipo_deporte:
                query = query.filter_by(tipo_deporte=tipo_deporte)
            if tipo_competicion:
                query = query.filter_by(tipo_competicion=tipo_competicion)
            if creado_por:
                query = query.filter_by(creado_por=int(creado_por))
            if buscar:
                query = query.filter(
                    db.or_(
                        Campeonato.nombre.ilike(f'%{buscar}%'),
                        Campeonato.descripcion.ilike(f'%{buscar}%')
                    )
                )

            # Aplicar ordenación
            if ordenar_por == 'fecha_inicio':
                query = query.order_by(Campeonato.fecha_inicio.desc() if orden == 'desc' else Campeonato.fecha_inicio.asc())
            elif ordenar_por == 'nombre':
                query = query.order_by(Campeonato.nombre.desc() if orden == 'desc' else Campeonato.nombre.asc())
            else:
                query = query.order_by(Campeonato.fecha_creacion.desc() if orden == 'desc' else Campeonato.fecha_creacion.asc())

            campeonatos = query.all()
            return [c.to_dict() for c in campeonatos], 200

        except Exception as e:
            campeonato_ns.abort(500, error=str(e))


@campeonato_ns.route('/<int:id_campeonato>')
@campeonato_ns.param('id_campeonato', 'ID del campeonato')
class CampeonatoDetail(Resource):
    @campeonato_ns.doc(description='Obtener detalles de un campeonato')
    @campeonato_ns.marshal_with(campeonato_output_model, code=200, envelope='campeonato')
    def get(self, id_campeonato):
        try:
            campeonato = Campeonato.query.get(id_campeonato)
            if not campeonato:
                campeonato_ns.abort(404, error='Campeonato no encontrado')
            return campeonato.to_dict(include_equipos=True), 200
        except Exception as e:
            campeonato_ns.abort(500, error=str(e))

    @campeonato_ns.doc(description='Actualizar campeonato (solo admin)', security='Bearer')
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

            # Actualizar campos
            if 'nombre' in data:
                existe = Campeonato.query.filter_by(nombre=data['nombre']).first()
                if existe and existe.id_campeonato != id_campeonato:
                    campeonato_ns.abort(400, error='Ya existe un campeonato con este nombre')
                campeonato.nombre = data['nombre']

            if 'descripcion' in data:
                campeonato.descripcion = data['descripcion']
            if 'max_equipos' in data:
                campeonato.max_equipos = data['max_equipos']
            if 'tipo_deporte' in data:
                campeonato.tipo_deporte = data['tipo_deporte']
            if 'tipo_competicion' in data:
                campeonato.tipo_competicion = data['tipo_competicion']
            if 'fecha_inicio' in data:
                campeonato.fecha_inicio = datetime.strptime(data['fecha_inicio'], '%Y-%m-%d').date()
            if 'fecha_fin' in data:
                campeonato.fecha_fin = datetime.strptime(data['fecha_fin'], '%Y-%m-%d').date()
            if 'fecha_inicio_inscripciones' in data:
                campeonato.fecha_inicio_inscripciones = datetime.strptime(data['fecha_inicio_inscripciones'], '%Y-%m-%d').date()
            if 'fecha_cierre_inscripciones' in data:
                campeonato.fecha_cierre_inscripciones = datetime.strptime(data['fecha_cierre_inscripciones'], '%Y-%m-%d').date()
            if 'inscripciones_abiertas' in data:
                campeonato.inscripciones_abiertas = data['inscripciones_abiertas']

            db.session.commit()
            return campeonato.to_dict(), 200

        except Exception as e:
            db.session.rollback()
            campeonato_ns.abort(500, error=str(e))

    @campeonato_ns.doc(description='Eliminar campeonato (solo admin)', security='Bearer')
    @campeonato_ns.marshal_with(message_response, code=200)
    @jwt_required()
    @role_required(['admin'])
    def delete(self, id_campeonato):
        try:
            campeonato = Campeonato.query.get(id_campeonato)
            if not campeonato:
                campeonato_ns.abort(404, error='Campeonato no encontrado')
            
            if campeonato.partidos.count() > 0:
                campeonato_ns.abort(400, error='No se puede eliminar un campeonato con partidos programados')

            db.session.delete(campeonato)
            db.session.commit()
            return {'mensaje': 'Campeonato eliminado exitosamente'}, 200
        except Exception as e:
            db.session.rollback()
            campeonato_ns.abort(500, error=str(e))


@campeonato_ns.route('/<int:id_campeonato>/estado')
@campeonato_ns.param('id_campeonato', 'ID del campeonato')
class CampeonatoEstado(Resource):
    @campeonato_ns.doc(description='Cambiar estado del campeonato (solo admin)', security='Bearer')
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
            current_user_id = get_jwt_identity()

            estados_validos = ['planificacion', 'en_curso', 'finalizado']
            if data['estado'] not in estados_validos:
                campeonato_ns.abort(400, error=f'Estado no válido. Debe ser: {", ".join(estados_validos)}')

            # Registrar historial
            historial = HistorialEstado(
                tipo_entidad='campeonato',
                id_entidad=id_campeonato,
                estado_anterior=campeonato.estado,
                estado_nuevo=data['estado'],
                cambiado_por=int(current_user_id),
                observaciones=data.get('observaciones')
            )
            db.session.add(historial)

            campeonato.estado = data['estado']
            db.session.commit()

            return campeonato.to_dict(), 200
        except Exception as e:
            db.session.rollback()
            campeonato_ns.abort(500, error=str(e))


# ============================================
# INSCRIPCIONES DE EQUIPOS
# ============================================

@campeonato_ns.route('/<int:id_campeonato>/inscripciones')
@campeonato_ns.param('id_campeonato', 'ID del campeonato')
class InscripcionList(Resource):
    @campeonato_ns.doc(description='Inscribir equipo en campeonato (líder o admin)', security='Bearer')
    @campeonato_ns.expect(inscripcion_input_model, validate=True)
    @jwt_required()
    @role_required(['admin', 'lider'])
    def post(self, id_campeonato):
        try:
            campeonato = Campeonato.query.get(id_campeonato)
            if not campeonato:
                campeonato_ns.abort(404, error='Campeonato no encontrado')

            if not campeonato.inscripciones_abiertas:
                campeonato_ns.abort(400, error='Las inscripciones están cerradas')

            data = campeonato_ns.payload
            equipo = Equipo.query.get(data['id_equipo'])
            if not equipo:
                campeonato_ns.abort(404, error='Equipo no encontrado')

            # Verificar que no esté ya inscrito
            inscripcion_existente = CampeonatoEquipo.query.filter_by(
                id_campeonato=id_campeonato,
                id_equipo=data['id_equipo']
            ).first()

            if inscripcion_existente:
                campeonato_ns.abort(400, error='El equipo ya está inscrito en este campeonato')

            # Verificar límite de equipos
            total_inscritos = campeonato.equipos_inscritos.filter_by(estado_inscripcion='aprobado').count()
            if total_inscritos >= campeonato.max_equipos:
                campeonato_ns.abort(400, error='Se alcanzó el máximo de equipos permitidos')

            # Crear inscripción
            nueva_inscripcion = CampeonatoEquipo(
                id_campeonato=id_campeonato,
                id_equipo=data['id_equipo'],
                estado_inscripcion='pendiente'
            )

            db.session.add(nueva_inscripcion)
            db.session.commit()

            return {'mensaje': 'Inscripción creada exitosamente', 'inscripcion': nueva_inscripcion.to_dict()}, 201

        except Exception as e:
            db.session.rollback()
            campeonato_ns.abort(500, error=str(e))

    @campeonato_ns.doc(
        description='Listar inscripciones del campeonato',
        params={'estado': 'Filtrar por estado (pendiente, aprobado, rechazado)'}
    )
    def get(self, id_campeonato):
        try:
            campeonato = Campeonato.query.get(id_campeonato)
            if not campeonato:
                campeonato_ns.abort(404, error='Campeonato no encontrado')

            estado = request.args.get('estado')
            query = campeonato.equipos_inscritos

            if estado:
                query = query.filter_by(estado_inscripcion=estado)

            inscripciones = query.order_by(CampeonatoEquipo.fecha_inscripcion.desc()).all()
            return {
                'campeonato': campeonato.nombre,
                'total_inscripciones': len(inscripciones),
                'inscripciones': [i.to_dict() for i in inscripciones]
            }, 200

        except Exception as e:
            campeonato_ns.abort(500, error=str(e))


@campeonato_ns.route('/<int:id_campeonato>/inscripciones/<int:id_inscripcion>/estado')
@campeonato_ns.param('id_campeonato', 'ID del campeonato')
@campeonato_ns.param('id_inscripcion', 'ID de la inscripción')
class InscripcionEstado(Resource):
    @campeonato_ns.doc(description='Aprobar/rechazar inscripción (solo admin)', security='Bearer')
    @campeonato_ns.expect(inscripcion_estado_model, validate=True)
    @jwt_required()
    @role_required(['admin'])
    def patch(self, id_campeonato, id_inscripcion):
        try:
            inscripcion = CampeonatoEquipo.query.get(id_inscripcion)
            if not inscripcion or inscripcion.id_campeonato != id_campeonato:
                campeonato_ns.abort(404, error='Inscripción no encontrada')

            data = campeonato_ns.payload
            current_user_id = get_jwt_identity()

            estados_validos = ['pendiente', 'aprobado', 'rechazado']
            if data['estado_inscripcion'] not in estados_validos:
                campeonato_ns.abort(400, error=f'Estado no válido. Debe ser: {", ".join(estados_validos)}')

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

            inscripcion.estado_inscripcion = data['estado_inscripcion']
            if 'observaciones' in data:
                inscripcion.observaciones = data['observaciones']

            db.session.commit()

            return {'mensaje': 'Estado actualizado exitosamente', 'inscripcion': inscripcion.to_dict()}, 200

        except Exception as e:
            db.session.rollback()
            campeonato_ns.abort(500, error=str(e))


# ============================================
# SORTEO DE GRUPOS
# ============================================

@campeonato_ns.route('/<int:id_campeonato>/sorteo-grupos')
@campeonato_ns.param('id_campeonato', 'ID del campeonato')
class SorteoGrupos(Resource):
    @campeonato_ns.doc(description='Realizar sorteo de grupos (solo admin)', security='Bearer')
    @campeonato_ns.expect(sorteo_grupos_model, validate=True)
    @jwt_required()
    @role_required(['admin'])
    def post(self, id_campeonato):
        try:
            campeonato = Campeonato.query.get(id_campeonato)
            if not campeonato:
                campeonato_ns.abort(404, error='Campeonato no encontrado')

            data = campeonato_ns.payload
            numero_grupos = data['numero_grupos']

            # Obtener equipos aprobados
            equipos_aprobados = campeonato.equipos_inscritos.filter_by(estado_inscripcion='aprobado').all()

            if len(equipos_aprobados) < numero_grupos:
                campeonato_ns.abort(400, error='No hay suficientes equipos aprobados para el número de grupos solicitado')

            # Mezclar equipos aleatoriamente
            random.shuffle(equipos_aprobados)

            # Asignar grupos
            letras_grupos = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H']
            equipos_por_grupo = len(equipos_aprobados) // numero_grupos

            for i, inscripcion in enumerate(equipos_aprobados):
                grupo_index = i // equipos_por_grupo if i < (numero_grupos * equipos_por_grupo) else numero_grupos - 1
                inscripcion.nombre_grupo = letras_grupos[grupo_index]
                inscripcion.numero_sorteo = i + 1

            db.session.commit()

            # Agrupar resultados
            resultados = {}
            for inscripcion in equipos_aprobados:
                grupo = inscripcion.nombre_grupo
                if grupo not in resultados:
                    resultados[grupo] = []
                resultados[grupo].append({
                    'numero_sorteo': inscripcion.numero_sorteo,
                    'equipo': inscripcion.equipo.nombre,
                    'lider': inscripcion.equipo.lider.nombre
                })

            return {
                'mensaje': 'Sorteo realizado exitosamente',
                'numero_grupos': numero_grupos,
                'total_equipos': len(equipos_aprobados),
                'grupos': resultados
            }, 200

        except Exception as e:
            db.session.rollback()
            campeonato_ns.abort(500, error=str(e))


# ============================================
# GENERAR PARTIDOS
# ============================================

@campeonato_ns.route('/<int:id_campeonato>/generar-partidos')
@campeonato_ns.param('id_campeonato', 'ID del campeonato')
class GenerarPartidos(Resource):
    @campeonato_ns.doc(description='Generar fixture del campeonato (solo admin)', security='Bearer')
    @campeonato_ns.expect(generar_partidos_model, validate=True)
    @jwt_required()
    @role_required(['admin'])
    def post(self, id_campeonato):
        try:
            campeonato = Campeonato.query.get(id_campeonato)
            if not campeonato:
                campeonato_ns.abort(404, error='Campeonato no encontrado')

            if campeonato.partidos_generados:
                campeonato_ns.abort(400, error='Los partidos ya fueron generados')

            data = campeonato_ns.payload

            # Obtener equipos aprobados
            inscripciones = campeonato.equipos_inscritos.filter_by(estado_inscripcion='aprobado').all()
            equipos = [i.equipo for i in inscripciones]

            if len(equipos) < 2:
                campeonato_ns.abort(400, error='Se necesitan al menos 2 equipos aprobados')

            fecha_inicio = datetime.strptime(data['fecha_inicio'], '%Y-%m-%d').date()
            dias_entre_jornadas = data.get('dias_entre_jornadas', 7)
            hora_inicio = data.get('hora_inicio', '15:00')
            hora_segundo = data.get('hora_segundo_partido', '17:00')
            incluir_vuelta = data.get('incluir_vuelta', True)

            partidos_creados = []
            jornada = 1
            fecha_actual = fecha_inicio

            # Generar combinaciones
            combinaciones = list(combinations(equipos, 2))
            partidos_por_jornada = len(equipos) // 2

            # IDA
            for i in range(0, len(combinaciones), partidos_por_jornada):
                partidos_jornada = combinaciones[i:i + partidos_por_jornada]

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

            # VUELTA
            if incluir_vuelta:
                for i in range(0, len(combinaciones), partidos_por_jornada):
                    partidos_jornada = combinaciones[i:i + partidos_por_jornada]

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

            campeonato.partidos_generados = True
            campeonato.fecha_generacion_partidos = datetime.utcnow()
            db.session.commit()

            return {
                'mensaje': 'Partidos generados exitosamente',
                'total_equipos': len(equipos),
                'total_jornadas': jornada - 1,
                'total_partidos': len(partidos_creados)
            }, 201

        except Exception as e:
            db.session.rollback()
            campeonato_ns.abort(500, error=str(e))


@campeonato_ns.route('/<int:id_campeonato>/partidos')
@campeonato_ns.param('id_campeonato', 'ID del campeonato')
class CampeonatoPartidos(Resource):
    @campeonato_ns.doc(description='Obtener partidos del campeonato')
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

# Obtener campeonatos del organizador actual (requiere autenticación)
@campeonato_ns.route('/mis-campeonatos')
class MisCampeonatos(Resource):
    @campeonato_ns.doc(
        description='Obtener campeonatos del organizador actual (requiere autenticación)',
        security='Bearer',
        responses={
            200: 'Lista de campeonatos del organizador',
            401: 'No autorizado',
            500: 'Error del servidor'
        }
    )
    @campeonato_ns.marshal_list_with(campeonato_output_model, code=200, envelope='campeonatos')
    @jwt_required()
    def get(self):
        """Obtener todos los campeonatos creados por el organizador actual"""
        try:
            # Obtener el ID del usuario del token JWT
            current_user_id = get_jwt_identity()
            
            # Obtener campeonatos creados por este organizador
            query = Campeonato.query.filter_by(creado_por=int(current_user_id))
            
            # Ordenar por fecha de creación (más recientes primero)
            campeonatos = query.order_by(Campeonato.fecha_creacion.desc()).all()
            
            # Convertir a diccionarios con información adicional
            resultado = []
            for campeonato in campeonatos:
                campeonato_dict = campeonato.to_dict()
                
                # Contar equipos inscritos y pendientes
                total_inscritos = campeonato.equipos_inscritos.filter_by(estado_inscripcion='aprobado').count()
                total_pendientes = campeonato.equipos_inscritos.filter_by(estado_inscripcion='pendiente').count()
                
                campeonato_dict['total_equipos_inscritos'] = total_inscritos
                campeonato_dict['total_equipos_pendientes'] = total_pendientes
                
                resultado.append(campeonato_dict)
            
            return resultado, 200
            
        except Exception as e:
            print(f"Error al obtener campeonatos: {str(e)}")
            campeonato_ns.abort(500, error=f'Error al obtener campeonatos: {str(e)}')

# ============================================
# INSCRIPCIONES CON PAGINACIÓN Y FILTROS
# ============================================

@campeonato_ns.route('/<int:id_campeonato>/inscripciones/paginado')
@campeonato_ns.param('id_campeonato', 'ID del campeonato')
class InscripcionesPaginadas(Resource):
    @campeonato_ns.doc(
        description='Listar inscripciones con paginación y ordenamiento',
        params={
            'pagina': 'Número de página (default: 1)',
            'limite': 'Elementos por página (default: 5)',
            'orden': 'Orden por fecha (asc/desc, default: desc)',
            'estado': 'Filtrar por estado (pendiente, aprobado, rechazado)',
            'fecha': 'Filtrar por fecha específica (YYYY-MM-DD)'
        }
    )
    def get(self, id_campeonato):
        """Obtener inscripciones con paginación y filtros"""
        try:
            campeonato = Campeonato.query.get(id_campeonato)
            if not campeonato:
                campeonato_ns.abort(404, error='Campeonato no encontrado')

            # Parámetros de paginación
            pagina = int(request.args.get('pagina', 1))
            limite = int(request.args.get('limite', 5))
            orden = request.args.get('orden', 'desc')
            estado = request.args.get('estado')
            fecha = request.args.get('fecha')

            # Query base
            query = campeonato.equipos_inscritos

            # Filtrar por estado
            if estado:
                query = query.filter_by(estado_inscripcion=estado)

            # Filtrar por fecha
            if fecha:
                try:
                    fecha_filtro = datetime.strptime(fecha, '%Y-%m-%d').date()
                    query = query.filter(db.func.date(CampeonatoEquipo.fecha_inscripcion) == fecha_filtro)
                except ValueError:
                    campeonato_ns.abort(400, error='Formato de fecha inválido. Use YYYY-MM-DD')

            # Ordenar por fecha de inscripción
            if orden == 'asc':
                query = query.order_by(CampeonatoEquipo.fecha_inscripcion.asc())
            else:
                query = query.order_by(CampeonatoEquipo.fecha_inscripcion.desc())

            # Paginación
            total = query.count()
            offset = (pagina - 1) * limite
            inscripciones = query.limit(limite).offset(offset).all()

            return {
                'campeonato': campeonato.nombre,
                'inscripciones': [i.to_dict() for i in inscripciones],
                'total': total,
                'pagina_actual': pagina,
                'total_paginas': (total + limite - 1) // limite,
                'items_por_pagina': limite
            }, 200

        except Exception as e:
            campeonato_ns.abort(500, error=str(e))

# ============================================
# NUEVOS ENDPOINTS PARA LÍDER DE EQUIPO
# ============================================

@campeonato_ns.route('/publicos')
class CampeonatosPublicos(Resource):
    @campeonato_ns.doc(
        description='Listar campeonatos públicos disponibles para inscripción',
        params={
            'tipo_deporte': 'Filtrar por tipo de deporte (futbol, indoor)',
            'estado': 'Filtrar por estado (planificacion, en_curso)',
            'buscar': 'Buscar por nombre'
        }
    )
    @campeonato_ns.marshal_list_with(campeonato_output_model, code=200, envelope='campeonatos')
    def get(self):
        """Obtener campeonatos públicos disponibles para inscripción"""
        try:
            # Filtros
            tipo_deporte = request.args.get('tipo_deporte')
            estado = request.args.get('estado')
            buscar = request.args.get('buscar')

            # Query base: solo públicos con inscripciones abiertas
            query = Campeonato.query.filter_by(
                es_publico=True,
                inscripciones_abiertas=True
            )

            # Aplicar filtros adicionales
            if tipo_deporte:
                query = query.filter_by(tipo_deporte=tipo_deporte)
            
            if estado:
                query = query.filter_by(estado=estado)
            else:
                # Por defecto, solo mostrar campeonatos en planificación o en curso
                query = query.filter(Campeonato.estado.in_(['planificacion', 'en_curso']))
            
            if buscar:
                query = query.filter(
                    db.or_(
                        Campeonato.nombre.ilike(f'%{buscar}%'),
                        Campeonato.descripcion.ilike(f'%{buscar}%')
                    )
                )

            # Ordenar por fecha de inicio
            campeonatos = query.order_by(Campeonato.fecha_inicio.asc()).all()
            
            return [c.to_dict() for c in campeonatos], 200

        except Exception as e:
            campeonato_ns.abort(500, error=f'Error al obtener campeonatos públicos: {str(e)}')


@campeonato_ns.route('/buscar-por-codigo')
class BuscarPorCodigo(Resource):
    @campeonato_ns.doc(
        description='Buscar campeonato por código de inscripción',
        params={'codigo': 'Código de inscripción del campeonato'}
    )
    @campeonato_ns.marshal_with(campeonato_output_model, code=200, envelope='campeonato')
    def get(self):
        """Buscar campeonato privado por código de inscripción"""
        try:
            codigo = request.args.get('codigo')
            
            if not codigo:
                campeonato_ns.abort(400, error='El código es requerido')

            # Buscar campeonato por código
            campeonato = Campeonato.query.filter_by(
                codigo_inscripcion=codigo.upper()
            ).first()

            if not campeonato:
                campeonato_ns.abort(404, error='Código de inscripción inválido')

            if not campeonato.inscripciones_abiertas:
                campeonato_ns.abort(400, error='Las inscripciones están cerradas para este campeonato')

            return campeonato.to_dict(), 200

        except Exception as e:
            campeonato_ns.abort(500, error=f'Error al buscar campeonato: {str(e)}')


@campeonato_ns.route('/generar-codigo/<int:id_campeonato>')
@campeonato_ns.param('id_campeonato', 'ID del campeonato')
class GenerarCodigoInscripcion(Resource):
    @campeonato_ns.doc(
        description='Generar código de inscripción único para un campeonato (solo admin)',
        security='Bearer'
    )
    @campeonato_ns.marshal_with(campeonato_output_model, code=200, envelope='campeonato')
    @jwt_required()
    @role_required(['admin', 'superadmin'])
    def post(self, id_campeonato):
        """Genera un código único de inscripción para el campeonato"""
        try:
            campeonato = Campeonato.query.get(id_campeonato)
            if not campeonato:
                campeonato_ns.abort(404, error='Campeonato no encontrado')

            # Generar código único de 6 caracteres
            while True:
                codigo = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
                
                # Verificar que no exista
                existe = Campeonato.query.filter_by(codigo_inscripcion=codigo).first()
                if not existe:
                    break

            campeonato.codigo_inscripcion = codigo
            db.session.commit()

            return campeonato.to_dict(), 200

        except Exception as e:
            db.session.rollback()
            campeonato_ns.abort(500, error=f'Error al generar código: {str(e)}')


# ============================================
# EQUIPOS INSCRITOS EN UN CAMPEONATO
# ============================================

@campeonato_ns.route('/<int:id_campeonato>/equipos-inscritos')
@campeonato_ns.param('id_campeonato', 'ID del campeonato')
class EquiposInscritos(Resource):
    @campeonato_ns.doc(
        description='Obtener equipos con solicitud de inscripción en el campeonato',
        params={
            'estado': 'Filtrar por estado de inscripción (pendiente, aprobado, rechazado)'
        },
        security='Bearer'
    )
    @jwt_required()
    @role_required(['admin'])
    def get(self, id_campeonato):
        """Obtener equipos que han enviado solicitud de inscripción"""
        try:
            campeonato = Campeonato.query.get(id_campeonato)
            if not campeonato:
                campeonato_ns.abort(404, error='Campeonato no encontrado')

            # Verificar que el campeonato pertenezca al organizador
            current_user_id = get_jwt_identity()
            if campeonato.creado_por != int(current_user_id):
                campeonato_ns.abort(403, error='No tienes permiso para ver los equipos de este campeonato')

            # Filtro de estado
            estado = request.args.get('estado')

            # Obtener inscripciones
            query = campeonato.equipos_inscritos

            if estado:
                query = query.filter_by(estado_inscripcion=estado)

            inscripciones = query.order_by(CampeonatoEquipo.fecha_inscripcion.desc()).all()

            # Formatear respuesta con datos completos del equipo
            equipos_data = []
            for inscripcion in inscripciones:
                equipo = inscripcion.equipo
                equipo_dict = equipo.to_dict()
                equipo_dict['inscripcion'] = {
                    'id_inscripcion': inscripcion.id,
                    'estado_inscripcion': inscripcion.estado_inscripcion,
                    'fecha_inscripcion': inscripcion.fecha_inscripcion.isoformat() if inscripcion.fecha_inscripcion else None,
                    'observaciones': inscripcion.observaciones
                }
                equipos_data.append(equipo_dict)

            return {
                'campeonato': campeonato.nombre,
                'total_equipos': len(equipos_data),
                'equipos': equipos_data
            }, 200

        except Exception as e:
            campeonato_ns.abort(500, error=f'Error al obtener equipos: {str(e)}')


# ============================================
# EQUIPOS INSCRITOS EN UN CAMPEONATO
# ============================================

@campeonato_ns.route('/<int:id_campeonato>/equipos-inscritos')
@campeonato_ns.param('id_campeonato', 'ID del campeonato')
class EquiposInscritos(Resource):
    @campeonato_ns.doc(
        description='Obtener equipos con solicitud de inscripción en el campeonato',
        params={
            'estado': 'Filtrar por estado de inscripción (pendiente, aprobado, rechazado)'
        },
        security='Bearer'
    )
    @jwt_required()
    @role_required(['admin'])
    def get(self, id_campeonato):
        """Obtener equipos que han enviado solicitud de inscripción"""
        try:
            campeonato = Campeonato.query.get(id_campeonato)
            if not campeonato:
                campeonato_ns.abort(404, error='Campeonato no encontrado')

            # Verificar que el campeonato pertenezca al organizador
            current_user_id = get_jwt_identity()
            if campeonato.creado_por != int(current_user_id):
                campeonato_ns.abort(403, error='No tienes permiso para ver los equipos de este campeonato')

            # Filtro de estado
            estado = request.args.get('estado')

            # Obtener inscripciones
            query = campeonato.equipos_inscritos

            if estado:
                query = query.filter_by(estado_inscripcion=estado)

            inscripciones = query.order_by(CampeonatoEquipo.fecha_inscripcion.desc()).all()

            # Formatear respuesta con datos completos del equipo
            equipos_data = []
            for inscripcion in inscripciones:
                equipo = inscripcion.equipo
                equipo_dict = equipo.to_dict()
                equipo_dict['inscripcion'] = {
                    'id_inscripcion': inscripcion.id,
                    'estado_inscripcion': inscripcion.estado_inscripcion,
                    'fecha_inscripcion': inscripcion.fecha_inscripcion.isoformat() if inscripcion.fecha_inscripcion else None,
                    'observaciones': inscripcion.observaciones
                }
                equipos_data.append(equipo_dict)

            return {
                'campeonato': campeonato.nombre,
                'total_equipos': len(equipos_data),
                'equipos': equipos_data
            }, 200

        except Exception as e:
            campeonato_ns.abort(500, error=f'Error al obtener equipos: {str(e)}')