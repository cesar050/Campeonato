from flask import request
from flask_restx import Namespace, fields, Resource
from flask_jwt_extended import jwt_required
from app.extensions import db
from app.models.alineacion import Alineacion
from app.services.backend_api_client import BackendAPIClient

alineacion_ns = Namespace('alineaciones', description='Gestión de alineaciones de partidos')

# ============================================
# MODELOS PARA DOCUMENTACIÓN SWAGGER
# ============================================

alineacion_input_model = alineacion_ns.model('AlineacionInput', {
    'id_partido': fields.Integer(required=True, description='ID del partido', example=1),
    'id_equipo': fields.Integer(required=True, description='ID del equipo', example=1),
    'nombre_jugador': fields.String(required=True, description='Nombre completo del jugador', example='Lionel Messi'),
    'titular': fields.Boolean(description='Si es titular', example=True),
    'minuto_entrada': fields.Integer(description='Minuto de entrada', example=0),
    'minuto_salida': fields.Integer(description='Minuto de salida')
})

# NUEVO: Modelo con posiciones para drag & drop
jugador_posicion_model = alineacion_ns.model('JugadorPosicion', {
    'id_jugador': fields.Integer(description='ID del jugador (preferido)'),
    'nombre': fields.String(description='Nombre del jugador (alternativo)'),
    'posicion_x': fields.Float(description='Posición X en cancha (0-100)'),
    'posicion_y': fields.Float(description='Posición Y en cancha (0-100)')
})

alineacion_definir_model = alineacion_ns.model('AlineacionDefinir', {
    'id_partido': fields.Integer(required=True, description='ID del partido'),
    'id_equipo': fields.Integer(required=True, description='ID del equipo'),
    'formacion': fields.String(description='Formación (4-4-2, 4-3-3, 1-2-1, etc)'),
    'titulares': fields.List(fields.Nested(jugador_posicion_model), description='Lista de titulares con posiciones'),
    'suplentes': fields.List(fields.Nested(jugador_posicion_model), description='Lista de suplentes'),
    'jugadores': fields.List(fields.Nested(jugador_posicion_model), description='Lista de jugadores (alternativo, incluye titulares y suplentes)')
})

cambio_model = alineacion_ns.model('Cambio', {
    'id_partido': fields.Integer(required=True, description='ID del partido'),
    'id_equipo': fields.Integer(required=True, description='ID del equipo'),
    'id_jugador_sale': fields.Integer(description='ID del jugador que sale (preferido)'),
    'id_jugador_entra': fields.Integer(description='ID del jugador que entra (preferido)'),
    'sale': fields.String(description='Nombre del jugador que sale (alternativo)'),
    'entra': fields.String(description='Nombre del jugador que entra (alternativo)'),
    'minuto': fields.Integer(required=True, description='Minuto del cambio')
})

auto_generar_model = alineacion_ns.model('AutoGenerar', {
    'id_campeonato': fields.Integer(required=True, description='ID del campeonato')
})

batch_model = alineacion_ns.model('Batch', {
    'id_partido': fields.Integer(required=True, description='ID del partido'),
    'id_equipo': fields.Integer(required=True, description='ID del equipo'),
    'titulares': fields.List(fields.String, required=True, description='Lista de nombres de titulares'),
    'suplentes': fields.List(fields.String, description='Lista de nombres de suplentes')
})

alineacion_output_model = alineacion_ns.model('AlineacionOutput', {
    'id_alineacion': fields.Integer(description='ID de la alineación'),
    'id_partido': fields.Integer(description='ID del partido'),
    'id_equipo': fields.Integer(description='ID del equipo'),
    'id_jugador': fields.Integer(description='ID del jugador'),
    'titular': fields.Boolean(description='Si es titular'),
    'minuto_entrada': fields.Integer(description='Minuto de entrada'),
    'minuto_salida': fields.Integer(description='Minuto de salida'),
    'posicion_x': fields.Float(description='Posición X en cancha (0-100)'),
    'posicion_y': fields.Float(description='Posición Y en cancha (0-100)'),
    'formacion': fields.String(description='Formación del equipo'),
    'jugador_nombre': fields.String(description='Nombre completo del jugador'),
    'dorsal': fields.Integer(description='Número de dorsal'),
    'posicion': fields.String(description='Posición del jugador'),
    'equipo_nombre': fields.String(description='Nombre del equipo')
})

message_response = alineacion_ns.model('MessageResponse', {
    'mensaje': fields.String(description='Mensaje de respuesta')
})

error_response = alineacion_ns.model('ErrorResponse', {
    'error': fields.String(description='Mensaje de error'),
    'mensaje': fields.String(description='Mensaje descriptivo adicional')
})

# ============================================
# ENDPOINTS
# ============================================

@alineacion_ns.route('')
class AlineacionList(Resource):
    @alineacion_ns.doc(
        description='Crear nueva alineación usando el nombre del jugador',
        security='Bearer',
        responses={
            201: 'Alineación creada exitosamente',
            400: 'Datos inválidos o validaciones fallidas',
            401: 'No autorizado',
            404: 'Partido, equipo o jugador no encontrado',
            500: 'Error interno del servidor'
        }
    )
    @alineacion_ns.expect(alineacion_input_model, validate=True)
    @alineacion_ns.marshal_with(alineacion_output_model, code=201, envelope='alineacion')
    @jwt_required()
    def post(self):
        """Crea una alineación usando NOMBRE del jugador"""
        try:
            data = alineacion_ns.payload

            api_client = BackendAPIClient()

            partido = api_client.get_partido(data['id_partido'])
            if not partido:
                alineacion_ns.abort(404, error='Partido no encontrado')

            if not api_client.validar_equipo_en_partido(data['id_equipo'], data['id_partido']):
                alineacion_ns.abort(400, error='El equipo no participa en este partido')

            nombre_jugador = data['nombre_jugador'].strip()

            try:
                import requests
                response = requests.get(
                    f"{api_client.base_url}/jugadores?id_equipo={data['id_equipo']}",
                    timeout=5
                )
                if response.status_code == 200:
                    jugadores = response.json().get('jugadores', [])

                    jugador = None
                    for j in jugadores:
                        nombre_completo = f"{j['nombre']} {j['apellido']}"
                        if nombre_jugador.lower() in nombre_completo.lower():
                            jugador = j
                            break

                    if not jugador:
                        alineacion_ns.abort(404, error='Jugador no encontrado', mensaje=f'No existe un jugador "{nombre_jugador}" en el equipo')

                    id_jugador = jugador['id_jugador']
                else:
                    alineacion_ns.abort(500, error='No se pudieron obtener los jugadores')
            except Exception as e:
                alineacion_ns.abort(500, error=f'Error al buscar jugador: {str(e)}')

            alineacion_existente = Alineacion.query.filter_by(
                id_partido=data['id_partido'],
                id_jugador=id_jugador
            ).first()

            if alineacion_existente:
                alineacion_ns.abort(400, error=f'{nombre_jugador} ya está en la alineación')

            nueva_alineacion = Alineacion(
                id_partido=data['id_partido'],
                id_equipo=data['id_equipo'],
                id_jugador=id_jugador,
                titular=data.get('titular', True),
                minuto_entrada=data.get('minuto_entrada', 0),
                minuto_salida=data.get('minuto_salida')
            )

            db.session.add(nueva_alineacion)
            db.session.commit()

            response = nueva_alineacion.to_dict()
            response['jugador_nombre'] = f"{jugador['nombre']} {jugador['apellido']}"
            response['dorsal'] = jugador['dorsal']
            response['posicion'] = jugador['posicion']

            equipo = api_client.get_equipo(data['id_equipo'])
            if equipo:
                response['equipo_nombre'] = equipo['nombre']

            return response, 201

        except Exception as e:
            db.session.rollback()
            alineacion_ns.abort(500, error=str(e))


    @alineacion_ns.doc(
        description='Obtener alineaciones con datos enriquecidos',
        params={
            'id_partido': 'Filtrar por ID del partido',
            'id_equipo': 'Filtrar por ID del equipo'
        },
        responses={
            200: 'Lista de alineaciones',
            500: 'Error interno del servidor'
        }
    )
    @alineacion_ns.marshal_list_with(alineacion_output_model, code=200, envelope='alineaciones')
    def get(self):
        """Obtiene alineaciones con datos enriquecidos"""
        try:
            id_partido = request.args.get('id_partido')
            id_equipo = request.args.get('id_equipo')

            query = Alineacion.query

            if id_partido:
                query = query.filter_by(id_partido=int(id_partido))

            if id_equipo:
                query = query.filter_by(id_equipo=int(id_equipo))

            alineaciones = query.all()

            api_client = BackendAPIClient()
            resultado = []

            for alineacion in alineaciones:
                data = alineacion.to_dict()

                jugador = api_client.get_jugador(alineacion.id_jugador)
                if jugador:
                    data['jugador_nombre'] = f"{jugador.get('nombre')} {jugador.get('apellido')}"
                    data['dorsal'] = jugador.get('dorsal')
                    data['posicion'] = jugador.get('posicion')

                equipo = api_client.get_equipo(alineacion.id_equipo)
                if equipo:
                    data['equipo_nombre'] = equipo.get('nombre')

                resultado.append(data)

            return resultado, 200

        except Exception as e:
            alineacion_ns.abort(500, error=str(e))


@alineacion_ns.route('/<int:id_alineacion>')
@alineacion_ns.param('id_alineacion', 'ID de la alineación')
class AlineacionDetail(Resource):
    @alineacion_ns.doc(
        description='Eliminar una alineación específica',
        security='Bearer',
        responses={
            200: 'Alineación eliminada',
            401: 'No autorizado',
            404: 'Alineación no encontrada',
            500: 'Error interno del servidor'
        }
    )
    @alineacion_ns.marshal_with(message_response, code=200)
    @jwt_required()
    def delete(self, id_alineacion):
        """Elimina una alineación"""
        try:
            alineacion = Alineacion.query.get(id_alineacion)

            if not alineacion:
                alineacion_ns.abort(404, error='Alineación no encontrada')

            db.session.delete(alineacion)
            db.session.commit()

            return {'mensaje': 'Alineación eliminada'}, 200

        except Exception as e:
            db.session.rollback()
            alineacion_ns.abort(500, error=str(e))


# ============================================
# DEFINIR ALINEACIÓN COMPLETA CON DRAG & DROP
# ============================================
@alineacion_ns.route('/definir-alineacion')
class DefinirAlineacion(Resource):
    @alineacion_ns.doc(
        description='Definir alineación completa para un equipo en un partido CON posiciones drag & drop',
        security='Bearer',
        responses={
            201: 'Alineación definida exitosamente',
            400: 'Datos inválidos o validaciones fallidas',
            401: 'No autorizado',
            404: 'Partido o equipo no encontrado',
            500: 'Error interno del servidor'
        }
    )
    @alineacion_ns.expect(alineacion_definir_model, validate=True)
    @alineacion_ns.marshal_with(message_response, code=201)
    @jwt_required()
    def post(self):
        try:
            data = alineacion_ns.payload

            api_client = BackendAPIClient()

            partido = api_client.get_partido(data['id_partido'])
            if not partido:
                alineacion_ns.abort(404, error='Partido no encontrado')

            # Permitir subir alineación siempre, incluso si el partido ya inició o está tarde
            # Las penalizaciones se calcularán en el proxy
            if partido.get('estado') not in ['programado', 'en_juego']:
                alineacion_ns.abort(400, error='Solo se puede definir alineación en partidos programados o en juego')

            if not api_client.validar_equipo_en_partido(data['id_equipo'], data['id_partido']):
                alineacion_ns.abort(400, error='El equipo no participa en este partido')

            import requests
            response = requests.get(
                f"{api_client.base_url}/jugadores?id_equipo={data['id_equipo']}",
                timeout=5
            )

            if response.status_code != 200:
                alineacion_ns.abort(500, error='No se pudieron obtener los jugadores')

            jugadores_equipo = response.json().get('jugadores', [])

            # Limpiar alineaciones previas
            Alineacion.query.filter_by(
                id_partido=data['id_partido'],
                id_equipo=data['id_equipo']
            ).delete()

            alineaciones_creadas = []
            errores = []

            # Determinar formato de datos recibidos
            # Formato nuevo: jugadores con id_jugador y titular flag
            # Formato antiguo: titulares y suplentes separados con nombre
            jugadores_data = data.get('jugadores', [])
            titulares_data = data.get('titulares', [])
            suplentes_data = data.get('suplentes', [])

            # Si viene en formato nuevo (jugadores)
            if jugadores_data:
                for idx, jugador_data in enumerate(jugadores_data):
                    id_jugador = jugador_data.get('id_jugador')
                    es_titular = jugador_data.get('titular', False)
                    
                    if not id_jugador:
                        errores.append(f"Jugador #{idx+1} sin id_jugador")
                        continue

                    # Buscar jugador por ID
                    jugador = None
                    for j in jugadores_equipo:
                        if j['id_jugador'] == id_jugador:
                            jugador = j
                            break

                    if not jugador:
                        errores.append(f"Jugador con ID {id_jugador} no encontrado")
                        continue

                    nueva_alineacion = Alineacion(
                        id_partido=data['id_partido'],
                        id_equipo=data['id_equipo'],
                        id_jugador=jugador['id_jugador'],
                        titular=es_titular,
                        minuto_entrada=0 if es_titular else None,
                        posicion_x=jugador_data.get('posicion_x'),
                        posicion_y=jugador_data.get('posicion_y'),
                        formacion=data.get('formacion')
                    )

                    db.session.add(nueva_alineacion)
                    alineaciones_creadas.append({
                        'nombre': f"{jugador['nombre']} {jugador['apellido']}",
                        'dorsal': jugador['dorsal'],
                        'posicion': jugador['posicion'],
                        'titular': es_titular,
                        'minuto_entrada': 0 if es_titular else None,
                        'posicion_x': jugador_data.get('posicion_x'),
                        'posicion_y': jugador_data.get('posicion_y')
                    })
            else:
                # Formato antiguo: titulares y suplentes separados
                # Procesar titulares CON POSICIONES
                for idx, titular in enumerate(titulares_data):
                    id_jugador = titular.get('id_jugador')
                    nombre_titular = titular.get('nombre', '').strip()

                    jugador = None
                    if id_jugador:
                        # Buscar por ID
                        for j in jugadores_equipo:
                            if j['id_jugador'] == id_jugador:
                                jugador = j
                                break
                    elif nombre_titular:
                        # Buscar por nombre (compatibilidad)
                        for j in jugadores_equipo:
                            nombre_completo = f"{j['nombre']} {j['apellido']}"
                            if nombre_titular.lower() in nombre_completo.lower():
                                jugador = j
                                break

                    if not jugador:
                        errores.append(f"Titular #{idx+1} no encontrado")
                        continue

                    nueva_alineacion = Alineacion(
                        id_partido=data['id_partido'],
                        id_equipo=data['id_equipo'],
                        id_jugador=jugador['id_jugador'],
                        titular=True,
                        minuto_entrada=0,
                        posicion_x=titular.get('posicion_x'),
                        posicion_y=titular.get('posicion_y'),
                        formacion=data.get('formacion')
                    )

                    db.session.add(nueva_alineacion)
                    alineaciones_creadas.append({
                        'nombre': f"{jugador['nombre']} {jugador['apellido']}",
                        'dorsal': jugador['dorsal'],
                        'posicion': jugador['posicion'],
                        'titular': True,
                        'minuto_entrada': 0,
                        'posicion_x': titular.get('posicion_x'),
                        'posicion_y': titular.get('posicion_y')
                    })

                # Procesar suplentes
                for suplente in suplentes_data:
                    id_jugador = suplente.get('id_jugador')
                    nombre_suplente = suplente.get('nombre', '').strip()

                    if not id_jugador and not nombre_suplente:
                        continue

                    jugador = None
                    if id_jugador:
                        # Buscar por ID
                        for j in jugadores_equipo:
                            if j['id_jugador'] == id_jugador:
                                jugador = j
                                break
                    elif nombre_suplente:
                        # Buscar por nombre (compatibilidad)
                        for j in jugadores_equipo:
                            nombre_completo = f"{j['nombre']} {j['apellido']}"
                            if nombre_suplente.lower() in nombre_completo.lower():
                                jugador = j
                                break

                    if not jugador:
                        errores.append(f"Suplente no encontrado")
                        continue

                    nueva_alineacion = Alineacion(
                        id_partido=data['id_partido'],
                        id_equipo=data['id_equipo'],
                        id_jugador=jugador['id_jugador'],
                        titular=False,
                        minuto_entrada=None,
                        formacion=data.get('formacion')
                    )

                    db.session.add(nueva_alineacion)
                    alineaciones_creadas.append({
                        'nombre': f"{jugador['nombre']} {jugador['apellido']}",
                        'dorsal': jugador['dorsal'],
                        'posicion': jugador['posicion'],
                        'titular': False
                    })

            db.session.commit()

            mensaje = f'Alineación definida: {len([a for a in alineaciones_creadas if a["titular"]])} titulares, {len([a for a in alineaciones_creadas if not a["titular"]])} suplentes'
            if errores:
                mensaje += f'. Errores: {", ".join(errores)}'

            return {
                'mensaje': mensaje,
                'alineaciones': alineaciones_creadas,
                'errores': errores if errores else None
            }, 201

        except Exception as e:
            db.session.rollback()
            alineacion_ns.abort(500, error=str(e))


# ============================================
# HACER CAMBIO DURANTE EL PARTIDO
# ============================================
@alineacion_ns.route('/cambio')
class HacerCambio(Resource):
    @alineacion_ns.doc(
        description='Realizar un cambio durante el partido (sacar titular, entrar suplente)',
        security='Bearer',
        responses={
            200: 'Cambio realizado exitosamente',
            400: 'Datos inválidos o validaciones fallidas',
            401: 'No autorizado',
            404: 'Partido o jugador no encontrado',
            500: 'Error interno del servidor'
        }
    )
    @alineacion_ns.expect(cambio_model, validate=True)
    @alineacion_ns.marshal_with(message_response, code=200)
    @jwt_required()
    def post(self):
        """Hace un cambio durante el partido"""
        try:
            data = alineacion_ns.payload
            api_client = BackendAPIClient()

            partido = api_client.get_partido(data['id_partido'])
            if not partido:
                alineacion_ns.abort(404, error='Partido no encontrado')

            if partido.get('estado') != 'en_juego':
                alineacion_ns.abort(400, error='Solo se pueden hacer cambios en partidos en juego')

            import requests
            response = requests.get(
                f"{api_client.base_url}/jugadores?id_equipo={data['id_equipo']}",
                timeout=5
            )

            if response.status_code != 200:
                alineacion_ns.abort(500, error='No se pudieron obtener los jugadores')

            jugadores_equipo = response.json().get('jugadores', [])

            # Buscar jugador que sale
            jugador_sale = None
            if data.get('id_jugador_sale'):
                for j in jugadores_equipo:
                    if j['id_jugador'] == data['id_jugador_sale']:
                        jugador_sale = j
                        break
            elif data.get('sale'):
                for j in jugadores_equipo:
                    nombre_completo = f"{j['nombre']} {j['apellido']}"
                    if data['sale'].lower() in nombre_completo.lower():
                        jugador_sale = j
                        break

            if not jugador_sale:
                alineacion_ns.abort(404, error=f'Jugador que sale no encontrado')

            # Buscar jugador que entra
            jugador_entra = None
            if data.get('id_jugador_entra'):
                for j in jugadores_equipo:
                    if j['id_jugador'] == data['id_jugador_entra']:
                        jugador_entra = j
                        break
            elif data.get('entra'):
                for j in jugadores_equipo:
                    nombre_completo = f"{j['nombre']} {j['apellido']}"
                    if data['entra'].lower() in nombre_completo.lower():
                        jugador_entra = j
                        break

            if not jugador_entra:
                alineacion_ns.abort(404, error=f'Jugador que entra no encontrado')

            alineacion_sale = Alineacion.query.filter_by(
                id_partido=data['id_partido'],
                id_equipo=data['id_equipo'],
                id_jugador=jugador_sale['id_jugador']
            ).first()

            if not alineacion_sale:
                alineacion_ns.abort(400, error=f'{data["sale"]} no está en la alineación')

            if alineacion_sale.minuto_salida is not None:
                alineacion_ns.abort(400, error=f'{data["sale"]} ya fue sustituido anteriormente')

            if alineacion_sale.minuto_entrada is not None and data['minuto'] <= alineacion_sale.minuto_entrada:
                alineacion_ns.abort(400, error='El minuto de salida debe ser mayor al de entrada')

            alineacion_entra = Alineacion.query.filter_by(
                id_partido=data['id_partido'],
                id_equipo=data['id_equipo'],
                id_jugador=jugador_entra['id_jugador']
            ).first()

            if not alineacion_entra:
                alineacion_ns.abort(400, error=f'{data["entra"]} no está en la lista de convocados')

            if alineacion_entra.minuto_entrada is not None:
                alineacion_ns.abort(400, error=f'{data["entra"]} ya está en la cancha')

            alineacion_sale.minuto_salida = data['minuto']
            alineacion_entra.minuto_entrada = data['minuto']

            db.session.commit()

            return {
                'mensaje': 'Cambio realizado exitosamente',
                'cambio': {
                    'sale': {
                        'nombre': f"{jugador_sale['nombre']} {jugador_sale['apellido']}",
                        'dorsal': jugador_sale['dorsal'],
                        'minuto_salida': data['minuto']
                    },
                    'entra': {
                        'nombre': f"{jugador_entra['nombre']} {jugador_entra['apellido']}",
                        'dorsal': jugador_entra['dorsal'],
                        'minuto_entrada': data['minuto']
                    }
                }
            }, 200

        except Exception as e:
            db.session.rollback()
            alineacion_ns.abort(500, error=str(e))


# ============================================
# AUTO-GENERAR (SOLO PRUEBAS)
# ============================================
@alineacion_ns.route('/auto-generar')
class AutoGenerarAlineaciones(Resource):
    @alineacion_ns.doc(
        description='Generar automáticamente alineaciones para todos los partidos de un campeonato (SOLO PARA PRUEBAS)',
        security='Bearer'
    )
    @alineacion_ns.expect(auto_generar_model, validate=True)
    @alineacion_ns.marshal_with(message_response, code=201)
    @jwt_required()
    def post(self):
        """Genera automáticamente alineaciones (SOLO PRUEBAS)"""
        try:
            import requests
            data = alineacion_ns.payload
            api_client = BackendAPIClient()

            response = requests.get(
                f"{api_client.base_url}/partido?id_campeonato={data['id_campeonato']}",
                timeout=10
            )

            if response.status_code != 200:
                alineacion_ns.abort(500, error='No se pudieron obtener los partidos')

            partidos = response.json().get('partidos', [])

            if not partidos:
                alineacion_ns.abort(404, error='No hay partidos en este campeonato')

            alineaciones_creadas = 0
            partidos_procesados = 0

            for partido in partidos:
                id_partido = partido['id_partido']
                id_equipo_local = partido['id_equipo_local']
                id_equipo_visitante = partido['id_equipo_visitante']

                for id_equipo in [id_equipo_local, id_equipo_visitante]:
                    response_jug = requests.get(
                        f"{api_client.base_url}/jugadores?id_equipo={id_equipo}",
                        timeout=5
                    )

                    if response_jug.status_code == 200:
                        jugadores = response_jug.json().get('jugadores', [])

                        for idx, jugador in enumerate(jugadores[:11]):
                            existe = Alineacion.query.filter_by(
                                id_partido=id_partido,
                                id_jugador=jugador['id_jugador']
                            ).first()

                            if not existe:
                                nueva_alineacion = Alineacion(
                                    id_partido=id_partido,
                                    id_equipo=id_equipo,
                                    id_jugador=jugador['id_jugador'],
                                    titular=(idx < 11),
                                    minuto_entrada=0 if idx < 11 else None
                                )
                                db.session.add(nueva_alineacion)
                                alineaciones_creadas += 1

                partidos_procesados += 1

            db.session.commit()

            return {
                'mensaje': 'Alineaciones generadas automáticamente',
                'partidos_procesados': partidos_procesados,
                'alineaciones_creadas': alineaciones_creadas
            }, 201

        except Exception as e:
            db.session.rollback()
            alineacion_ns.abort(500, error=str(e))