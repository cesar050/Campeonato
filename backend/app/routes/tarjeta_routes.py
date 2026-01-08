from flask import request
from flask_restx import Namespace, fields, Resource
from flask_jwt_extended import jwt_required
from app.middlewares.auth_middleware import role_required
from app.extensions import db
from app.models.tarjeta import Tarjeta
from app.models.partido import Partido
from app.models.jugador import Jugador
from app.models.equipo import Equipo

tarjeta_ns = Namespace('tarjetas', description='Gestión de tarjetas en partidos de fútbol')

# ============================================
# MODELOS SWAGGER
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
    'fecha_creacion': fields.DateTime(description='Fecha de creación'),
    'jugador': fields.String(description='Nombre del jugador'),
    'equipo': fields.String(description='Nombre del equipo')
})

disciplina_model = tarjeta_ns.model('Disciplina', {
    'posicion': fields.Integer(description='Posición en la tabla'),
    'id_jugador': fields.Integer(description='ID del jugador'),
    'nombre': fields.String(description='Nombre completo del jugador'),
    'equipo': fields.String(description='Nombre del equipo'),
    'dorsal': fields.Integer(description='Número de dorsal'),
    'amarillas': fields.Integer(description='Total de tarjetas amarillas'),
    'rojas': fields.Integer(description='Total de tarjetas rojas'),
    'total': fields.Integer(description='Total de tarjetas')
})

message_response = tarjeta_ns.model('MessageResponse', {
    'mensaje': fields.String(description='Mensaje de respuesta')
})

# ============================================
# ENDPOINTS
# ============================================

@tarjeta_ns.route('')
class TarjetaList(Resource):
    @tarjeta_ns.doc(description='Crear nueva tarjeta en un partido', security='Bearer')
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

            # CRÍTICO: Verificar que el resultado NO esté registrado
            if partido.resultado_registrado:
                tarjeta_ns.abort(400, error='No se pueden agregar tarjetas a un partido con resultado registrado (inmutable)')

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

            result = nueva_tarjeta.to_dict()
            result['jugador'] = f"{jugador.nombre} {jugador.apellido}"
            result['equipo'] = jugador.equipo.nombre

            return result, 201

        except ValueError:
            db.session.rollback()
            tarjeta_ns.abort(400, error='El minuto debe ser un número válido')
        except Exception as e:
            db.session.rollback()
            tarjeta_ns.abort(500, error=str(e))

    @tarjeta_ns.doc(
        description='Listar tarjetas con filtros',
        params={
            'id_partido': 'Filtrar por ID del partido',
            'id_jugador': 'Filtrar por ID del jugador',
            'id_equipo': 'Filtrar por ID del equipo',
            'tipo': 'Filtrar por tipo de tarjeta (amarilla, roja)',
            'ordenar_por': 'Ordenar por (minuto, fecha_creacion)',
            'orden': 'Orden (asc, desc)'
        }
    )
    @tarjeta_ns.marshal_list_with(tarjeta_output_model, code=200, envelope='tarjetas')
    def get(self):
        try:
            id_partido = request.args.get('id_partido')
            id_jugador = request.args.get('id_jugador')
            id_equipo = request.args.get('id_equipo')
            tipo = request.args.get('tipo')
            ordenar_por = request.args.get('ordenar_por', 'minuto')
            orden = request.args.get('orden', 'asc')

            query = Tarjeta.query

            if id_partido:
                query = query.filter_by(id_partido=int(id_partido))
            if id_jugador:
                query = query.filter_by(id_jugador=int(id_jugador))
            if id_equipo:
                query = query.join(Jugador).filter(Jugador.id_equipo == int(id_equipo))
            if tipo:
                query = query.filter_by(tipo=tipo)

            # Ordenar
            if ordenar_por == 'fecha_creacion':
                query = query.order_by(Tarjeta.fecha_registro.desc() if orden == 'desc' else Tarjeta.fecha_registro.asc())
            else:
                query = query.order_by(Tarjeta.minuto.desc() if orden == 'desc' else Tarjeta.minuto.asc())

            tarjetas = query.all()
            
            resultado = []
            for t in tarjetas:
                tarjeta_dict = t.to_dict()
                jugador = Jugador.query.get(t.id_jugador)
                tarjeta_dict['jugador'] = f"{jugador.nombre} {jugador.apellido}"
                tarjeta_dict['equipo'] = jugador.equipo.nombre
                resultado.append(tarjeta_dict)

            return resultado, 200

        except Exception as e:
            tarjeta_ns.abort(500, error=str(e))


@tarjeta_ns.route('/<int:id_tarjeta>')
@tarjeta_ns.param('id_tarjeta', 'ID de la tarjeta')
class TarjetaDetail(Resource):
    @tarjeta_ns.doc(description='Obtener detalles de una tarjeta específica')
    @tarjeta_ns.marshal_with(tarjeta_output_model, code=200, envelope='tarjeta')
    def get(self, id_tarjeta):
        try:
            tarjeta = Tarjeta.query.get(id_tarjeta)
            if not tarjeta:
                tarjeta_ns.abort(404, error='Tarjeta no encontrada')

            result = tarjeta.to_dict()
            jugador = Jugador.query.get(tarjeta.id_jugador)
            result['jugador'] = f"{jugador.nombre} {jugador.apellido}"
            result['equipo'] = jugador.equipo.nombre

            return result, 200

        except Exception as e:
            tarjeta_ns.abort(500, error=str(e))

    @tarjeta_ns.doc(description='Eliminar una tarjeta (solo admin, solo si resultado NO registrado)', security='Bearer')
    @tarjeta_ns.marshal_with(message_response, code=200)
    @jwt_required()
    @role_required(['admin'])
    def delete(self, id_tarjeta):
        try:
            tarjeta = Tarjeta.query.get(id_tarjeta)
            if not tarjeta:
                tarjeta_ns.abort(404, error='Tarjeta no encontrada')

            partido = Partido.query.get(tarjeta.id_partido)
            
            # CRÍTICO: No se puede eliminar si el resultado está registrado
            if partido.resultado_registrado:
                tarjeta_ns.abort(400, error='No se pueden eliminar tarjetas de un partido con resultado registrado (inmutable)')

            db.session.delete(tarjeta)
            db.session.commit()

            return {'mensaje': 'Tarjeta eliminada exitosamente'}, 200

        except Exception as e:
            db.session.rollback()
            tarjeta_ns.abort(500, error=str(e))


@tarjeta_ns.route('/disciplina')
class TablaDisciplina(Resource):
    @tarjeta_ns.doc(
        description='Obtener tabla de disciplina (tarjetas por jugador)',
        params={
            'id_campeonato': 'Filtrar por ID del campeonato',
            'tipo': 'Filtrar por tipo (amarilla, roja)',
            'limit': 'Número máximo de resultados (default: 10)'
        }
    )
    @tarjeta_ns.marshal_list_with(disciplina_model, code=200, envelope='disciplina')
    def get(self):
        try:
            id_campeonato = request.args.get('id_campeonato')
            tipo = request.args.get('tipo')
            limit = request.args.get('limit', 10)

            query = db.session.query(
                Jugador.id_jugador,
                Jugador.nombre,
                Jugador.apellido,
                Jugador.dorsal,
                Equipo.nombre.label('equipo_nombre'),
                db.func.sum(db.case((Tarjeta.tipo == 'amarilla', 1), else_=0)).label('amarillas'),
                db.func.sum(db.case((Tarjeta.tipo == 'roja', 1), else_=0)).label('rojas'),
                db.func.count(Tarjeta.id_tarjeta).label('total')
            ).join(
                Tarjeta, Tarjeta.id_jugador == Jugador.id_jugador
            ).join(
                Equipo, Equipo.id_equipo == Jugador.id_equipo
            )

            if id_campeonato:
                query = query.join(
                    Partido, Partido.id_partido == Tarjeta.id_partido
                ).filter(
                    Partido.id_campeonato == int(id_campeonato)
                )

            if tipo:
                query = query.filter(Tarjeta.tipo == tipo)

            jugadores = query.group_by(
                Jugador.id_jugador, Equipo.nombre
            ).order_by(
                db.desc('total')
            ).limit(int(limit)).all()

            resultado = []
            for pos, jugador in enumerate(jugadores, start=1):
                resultado.append({
                    'posicion': pos,
                    'id_jugador': jugador.id_jugador,
                    'nombre': f"{jugador.nombre} {jugador.apellido}",
                    'equipo': jugador.equipo_nombre,
                    'dorsal': jugador.dorsal,
                    'amarillas': jugador.amarillas or 0,
                    'rojas': jugador.rojas or 0,
                    'total': jugador.total
                })

            return resultado, 200

        except Exception as e:
            tarjeta_ns.abort(500, error=str(e))


@tarjeta_ns.route('/partido/<int:id_partido>')
@tarjeta_ns.param('id_partido', 'ID del partido')
class TarjetasPorPartido(Resource):
    @tarjeta_ns.doc(description='Obtener todas las tarjetas de un partido específico')
    def get(self, id_partido):
        try:
            partido = Partido.query.get(id_partido)
            if not partido:
                tarjeta_ns.abort(404, error='Partido no encontrado')

            tarjetas = Tarjeta.query.filter_by(id_partido=id_partido).order_by(Tarjeta.minuto.asc()).all()

            resultado = []
            for t in tarjetas:
                tarjeta_dict = t.to_dict()
                jugador = Jugador.query.get(t.id_jugador)
                tarjeta_dict['jugador'] = f"{jugador.nombre} {jugador.apellido}"
                tarjeta_dict['equipo'] = jugador.equipo.nombre
                resultado.append(tarjeta_dict)

            return {
                'partido': f"{partido.equipo_local.nombre} vs {partido.equipo_visitante.nombre}",
                'total_tarjetas': len(tarjetas),
                'amarillas': len([t for t in tarjetas if t.tipo == 'amarilla']),
                'rojas': len([t for t in tarjetas if t.tipo == 'roja']),
                'tarjetas': resultado
            }, 200

        except Exception as e:
            tarjeta_ns.abort(500, error=str(e))