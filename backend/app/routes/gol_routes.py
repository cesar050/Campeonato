
from flask import request
from flask_restx import Namespace, fields, Resource
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.middlewares.auth_middleware import role_required
from app.extensions import db
from app.models.gol import Gol
from app.models.partido import Partido
from app.models.jugador import Jugador
from app.enums.gol_enum import TipoGol
from datetime import datetime

gol_ns = Namespace('goles', description='Gestión de goles en partidos de fútbol')

# ============================================
# MODELOS PARA DOCUMENTACIÓN SWAGGER
# ============================================

gol_input_model = gol_ns.model('GolInput', {
    'id_partido': fields.Integer(required=True, description='ID del partido', example=1),
    'nombre_jugador': fields.String(required=True, description='Nombre completo del jugador', example='Lionel Messi'),
    'minuto': fields.Integer(required=True, description='Minuto del gol (1-120)', example=45),
    'tipo': fields.String(description='Tipo de gol', enum=['normal', 'penal', 'autogol', 'tiro_libre'], example='normal')
})

gol_output_model = gol_ns.model('GolOutput', {
    'id_gol': fields.Integer(description='ID del gol'),
    'id_partido': fields.Integer(description='ID del partido'),
    'id_jugador': fields.Integer(description='ID del jugador'),
    'minuto': fields.Integer(description='Minuto del gol'),
    'tipo': fields.String(description='Tipo de gol'),
    'fecha_creacion': fields.DateTime(description='Fecha de creación'),
    'jugador': fields.String(description='Nombre del jugador'),
    'equipo': fields.String(description='Nombre del equipo'),
    'marcador_actual': fields.String(description='Marcador actual del partido')
})

goleador_model = gol_ns.model('Goleador', {
    'posicion': fields.Integer(description='Posición en la tabla'),
    'id_jugador': fields.Integer(description='ID del jugador'),
    'nombre': fields.String(description='Nombre completo del jugador'),
    'dorsal': fields.Integer(description='Número de dorsal'),
    'goles': fields.Integer(description='Total de goles')
})

message_response = gol_ns.model('MessageResponse', {
    'mensaje': fields.String(description='Mensaje de respuesta')
})

error_response = gol_ns.model('ErrorResponse', {
    'error': fields.String(description='Mensaje de error'),
    'mensaje': fields.String(description='Mensaje descriptivo adicional'),
    'sugerencia': fields.String(description='Sugerencia adicional')
})


# ============================================
# ENDPOINTS
# ============================================

@gol_ns.route('')
class GolList(Resource):
    @gol_ns.doc(
        description='Crear nuevo gol en un partido',
        security='Bearer',
        responses={
            201: 'Gol creado exitosamente',
            400: 'Datos inválidos o validaciones fallidas',
            401: 'No autorizado',
            403: 'Permisos insuficientes',
            404: 'Partido o jugador no encontrado'
        }
    )
    @gol_ns.expect(gol_input_model, validate=True)
    @gol_ns.marshal_with(gol_output_model, code=201, envelope='gol')
    @jwt_required()
    @role_required(['admin', 'lider'])
    def post(self):
        try:
            data = gol_ns.payload

            # Buscar partido
            partido = Partido.query.get(data['id_partido'])
            if not partido:
                gol_ns.abort(404, error='Partido no encontrado')

            # Buscar jugador por nombre
            nombre_completo = data['nombre_jugador'].strip()
            partes = nombre_completo.split()
            jugador = None

            # Buscar por nombre completo
            jugador = Jugador.query.filter(
                db.func.concat(Jugador.nombre, ' ', Jugador.apellido).ilike(f"%{nombre_completo}%")
            ).first()

            # Si no encuentra, buscar solo por nombre o apellido
            if not jugador and len(partes) >= 1:
                jugador = Jugador.query.filter(
                    (Jugador.nombre.ilike(f"%{partes[0]}%")) |
                    (Jugador.apellido.ilike(f"%{partes[0]}%"))
                ).first()

            if not jugador:
                gol_ns.abort(404, error='Jugador no encontrado',
                           mensaje=f'No existe un jugador con el nombre "{nombre_completo}"',
                           sugerencia='Verifica el nombre o usa GET /api/jugadores para ver todos los jugadores')

            # Verificar que el jugador pertenece a uno de los equipos del partido
            if jugador.id_equipo not in [partido.id_equipo_local, partido.id_equipo_visitante]:
                gol_ns.abort(400, error='El jugador no pertenece a ninguno de los equipos del partido',
                           mensaje=f"Jugador: {jugador.nombre} {jugador.apellido}, Equipo: {jugador.equipo.nombre}",
                           partido=f"{partido.equipo_local.nombre} vs {partido.equipo_visitante.nombre}")

            minuto = int(data['minuto'])
            if minuto < 1 or minuto > 120:
                gol_ns.abort(400, error='El minuto debe estar entre 1 y 120')

            # Mapear string a Enum
            tipo_str = data.get('tipo', 'normal').lower()

            tipo_map = {
                'normal': TipoGol.NORMAL,
                'penal': TipoGol.PENAL,
                'autogol': TipoGol.AUTOGOL,
                'tiro_libre': TipoGol.TIRO_LIBRE
            }

            if tipo_str not in tipo_map:
                gol_ns.abort(400, error=f'Tipo no válido. Debe ser uno de: normal, penal, autogol, tiro_libre')

            tipo_enum = tipo_map[tipo_str]

            # Crear gol con ENUM
            nuevo_gol = Gol(
                id_partido=data['id_partido'],
                id_jugador=jugador.id_jugador,
                minuto=minuto,
                tipo=tipo_enum
            )

            db.session.add(nuevo_gol)

            # Actualizar marcador automáticamente
            if tipo_enum != TipoGol.AUTOGOL:
                if jugador.id_equipo == partido.id_equipo_local:
                    partido.goles_local += 1
                else:
                    partido.goles_visitante += 1
            else:
                # Autogol suma al equipo contrario
                if jugador.id_equipo == partido.id_equipo_local:
                    partido.goles_visitante += 1
                else:
                    partido.goles_local += 1

            db.session.commit()

            marcador = f"{partido.equipo_local.nombre} {partido.goles_local} - {partido.goles_visitante} {partido.equipo_visitante.nombre}"

            return {
                'id_gol': nuevo_gol.id_gol,
                'id_partido': nuevo_gol.id_partido,
                'id_jugador': nuevo_gol.id_jugador,
                'minuto': nuevo_gol.minuto,
                'tipo': nuevo_gol.tipo.value,
                'jugador': f"{jugador.nombre} {jugador.apellido}",
                'equipo': jugador.equipo.nombre,
                'marcador_actual': marcador
            }, 201

        except ValueError:
            db.session.rollback()
            gol_ns.abort(400, error='El minuto debe ser un número válido')
        except Exception as e:
            db.session.rollback()
            gol_ns.abort(500, error=str(e))

    @gol_ns.doc(
        description='Listar goles con filtros opcionales',
        params={
            'id_partido': 'Filtrar por ID del partido',
            'id_jugador': 'Filtrar por ID del jugador',
            'tipo': 'Filtrar por tipo de gol'
        },
        responses={
            200: 'Lista de goles',
            500: 'Error interno del servidor'
        }
    )
    @gol_ns.marshal_list_with(gol_output_model, code=200, envelope='goles')
    def get(self):
        try:
            id_partido = request.args.get('id_partido')
            id_jugador = request.args.get('id_jugador')
            tipo = request.args.get('tipo')

            query = Gol.query

            if id_partido:
                query = query.filter_by(id_partido=int(id_partido))

            if id_jugador:
                query = query.filter_by(id_jugador=int(id_jugador))

            if tipo:
                query = query.filter_by(tipo=tipo)

            goles = query.order_by(Gol.minuto.asc()).all()
            return [g.to_dict() for g in goles], 200

        except Exception as e:
            gol_ns.abort(500, error=str(e))


@gol_ns.route('/<int:id_gol>')
@gol_ns.param('id_gol', 'ID del gol')
class GolDetail(Resource):
    @gol_ns.doc(
        description='Obtener detalles de un gol específico',
        responses={
            200: 'Gol encontrado',
            404: 'Gol no encontrado',
            500: 'Error interno del servidor'
        }
    )
    @gol_ns.marshal_with(gol_output_model, code=200, envelope='gol')
    def get(self, id_gol):
        try:
            gol = Gol.query.get(id_gol)

            if not gol:
                gol_ns.abort(404, error='Gol no encontrado')

            return gol.to_dict(), 200

        except Exception as e:
            gol_ns.abort(500, error=str(e))

    @gol_ns.doc(
        description='Eliminar un gol (solo admin)',
        security='Bearer',
        responses={
            200: 'Gol eliminado exitosamente',
            401: 'No autorizado',
            403: 'Permisos insuficientes - solo admin',
            404: 'Gol no encontrado',
            500: 'Error interno del servidor'
        }
    )
    @gol_ns.marshal_with(message_response, code=200)
    @jwt_required()
    @role_required(['admin'])
    def delete(self, id_gol):
        try:
            gol = Gol.query.get(id_gol)

            if not gol:
                gol_ns.abort(404, error='Gol no encontrado')

            partido = Partido.query.get(gol.id_partido)
            jugador = Jugador.query.get(gol.id_jugador)

            if gol.tipo != TipoGol.AUTOGOL:
                if jugador.id_equipo == partido.id_equipo_local:
                    partido.goles_local = max(0, partido.goles_local - 1)
                else:
                    partido.goles_visitante = max(0, partido.goles_visitante - 1)
            else:
                if jugador.id_equipo == partido.id_equipo_local:
                    partido.goles_visitante = max(0, partido.goles_visitante - 1)
                else:
                    partido.goles_local = max(0, partido.goles_local - 1)

            db.session.delete(gol)
            db.session.commit()

            return {'mensaje': 'Gol eliminado exitosamente'}, 200

        except Exception as e:
            db.session.rollback()
            gol_ns.abort(500, error=str(e))


@gol_ns.route('/goleadores')
class Goleadores(Resource):
    @gol_ns.doc(
        description='Obtener tabla de goleadores',
        params={
            'id_campeonato': 'Filtrar por ID del campeonato',
            'limit': 'Número máximo de resultados (default: 10)'
        },
        responses={
            200: 'Lista de goleadores',
            500: 'Error interno del servidor'
        }
    )
    @gol_ns.marshal_list_with(goleador_model, code=200, envelope='goleadores')
    def get(self):
        try:
            id_campeonato = request.args.get('id_campeonato')
            limit = request.args.get('limit', 10)

            query = db.session.query(
                Jugador.id_jugador,
                Jugador.nombre,
                Jugador.apellido,
                Jugador.dorsal,
                db.func.count(Gol.id_gol).label('total_goles')
            ).join(
                Gol, Gol.id_jugador == Jugador.id_jugador
            ).filter(
                Gol.tipo != TipoGol.AUTOGOL
            )

            if id_campeonato:
                query = query.join(
                    Partido, Partido.id_partido == Gol.id_partido
                ).filter(
                    Partido.id_campeonato == int(id_campeonato)
                )

            goleadores = query.group_by(
                Jugador.id_jugador
            ).order_by(
                db.desc('total_goles')
            ).limit(int(limit)).all()

            resultado = []
            for pos, goleador in enumerate(goleadores, start=1):
                resultado.append({
                    'posicion': pos,
                    'id_jugador': goleador.id_jugador,
                    'nombre': f"{goleador.nombre} {goleador.apellido}",
                    'dorsal': goleador.dorsal,
                    'goles': goleador.total_goles
                })

            return resultado, 200

        except Exception as e:
            gol_ns.abort(500, error=str(e))