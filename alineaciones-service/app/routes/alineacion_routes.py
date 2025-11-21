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

jugador_nombre_model = alineacion_ns.model('JugadorNombre', {
    'nombre': fields.String(description='Nombre del jugador')
})

alineacion_definir_model = alineacion_ns.model('AlineacionDefinir', {
    'id_partido': fields.Integer(required=True, description='ID del partido'),
    'id_equipo': fields.Integer(required=True, description='ID del equipo'),
    'titulares': fields.List(fields.Nested(jugador_nombre_model), required=True, description='Lista de titulares'),
    'suplentes': fields.List(fields.Nested(jugador_nombre_model), description='Lista de suplentes')
})

cambio_model = alineacion_ns.model('Cambio', {
    'id_partido': fields.Integer(required=True, description='ID del partido'),
    'id_equipo': fields.Integer(required=True, description='ID del equipo'),
    'sale': fields.String(required=True, description='Nombre del jugador que sale'),
    'entra': fields.String(required=True, description='Nombre del jugador que entra'),
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

            # Cliente para consultar backend principal
            api_client = BackendAPIClient()

            # Validar que el partido existe
            partido = api_client.get_partido(data['id_partido'])
            if not partido:
                alineacion_ns.abort(404, error='Partido no encontrado')

            # Validar que el equipo participa en el partido
            if not api_client.validar_equipo_en_partido(data['id_equipo'], data['id_partido']):
                alineacion_ns.abort(400, error='El equipo no participa en este partido')

            # Buscar jugador por nombre
            nombre_jugador = data['nombre_jugador'].strip()

            # Obtener todos los jugadores del equipo
            try:
                import requests
                response = requests.get(
                    f"{api_client.base_url}/jugadores?id_equipo={data['id_equipo']}",
                    timeout=5
                )
                if response.status_code == 200:
                    jugadores = response.json().get('jugadores', [])

                    # Buscar por nombre completo
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

            # Validar que el jugador no esté ya en la alineación
            alineacion_existente = Alineacion.query.filter_by(
                id_partido=data['id_partido'],
                id_jugador=id_jugador
            ).first()

            if alineacion_existente:
                alineacion_ns.abort(400, error=f'{nombre_jugador} ya está en la alineación')

            # Crear alineación
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

            # Enriquecer respuesta
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

            # Enriquecer con datos del backend principal
            api_client = BackendAPIClient()
            resultado = []

            for alineacion in alineaciones:
                data = alineacion.to_dict()

                # Obtener datos del jugador
                jugador = api_client.get_jugador(alineacion.id_jugador)
                if jugador:
                    data['jugador_nombre'] = f"{jugador.get('nombre')} {jugador.get('apellido')}"
                    data['dorsal'] = jugador.get('dorsal')
                    data['posicion'] = jugador.get('posicion')

                # Obtener datos del equipo
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
# NUEVO: DEFINIR ALINEACIÓN COMPLETA
# ============================================
@alineacion_ns.route('/definir-alineacion')
class DefinirAlineacion(Resource):
    @alineacion_ns.doc(
        description='Definir alineación completa para un equipo en un partido',
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

            # Validaciones ya manejadas por el modelo

            api_client = BackendAPIClient()

            # Validar partido
            partido = api_client.get_partido(data['id_partido'])
            if not partido:
                alineacion_ns.abort(404, error='Partido no encontrado')

            # Validar que el partido esté en estado 'programado'
            if partido.get('estado') != 'programado':
                alineacion_ns.abort(400, error='Solo se puede definir alineación en partidos programados')

            # Validar equipo en partido
            if not api_client.validar_equipo_en_partido(data['id_equipo'], data['id_partido']):
                alineacion_ns.abort(400, error='El equipo no participa en este partido')

            # Obtener jugadores del equipo
            import requests
            response = requests.get(
                f"{api_client.base_url}/jugadores?id_equipo={data['id_equipo']}",
                timeout=5
            )

            if response.status_code != 200:
                alineacion_ns.abort(500, error='No se pudieron obtener los jugadores')

            jugadores_equipo = response.json().get('jugadores', [])

            # Limpiar alineaciones previas de este equipo en este partido
            Alineacion.query.filter_by(
                id_partido=data['id_partido'],
                id_equipo=data['id_equipo']
            ).delete()

            alineaciones_creadas = []
            errores = []

            # Procesar titulares
            for idx, titular in enumerate(data.get('titulares', [])):
                nombre_titular = titular.get('nombre', '').strip()

                if not nombre_titular:
                    errores.append(f"Titular #{idx+1} sin nombre")
                    continue

                # Buscar jugador
                jugador = None
                for j in jugadores_equipo:
                    nombre_completo = f"{j['nombre']} {j['apellido']}"
                    if nombre_titular.lower() in nombre_completo.lower():
                        jugador = j
                        break

                if not jugador:
                    errores.append(f"Titular '{nombre_titular}' no encontrado")
                    continue

                nueva_alineacion = Alineacion(
                    id_partido=data['id_partido'],
                    id_equipo=data['id_equipo'],
                    id_jugador=jugador['id_jugador'],
                    titular=True,
                    minuto_entrada=0
                )

                db.session.add(nueva_alineacion)
                alineaciones_creadas.append({
                    'nombre': f"{jugador['nombre']} {jugador['apellido']}",
                    'dorsal': jugador['dorsal'],
                    'posicion': jugador['posicion'],
                    'titular': True,
                    'minuto_entrada': 0
                })

            # Procesar suplentes
            for suplente in data.get('suplentes', []):
                nombre_suplente = suplente.get('nombre', '').strip()

                if not nombre_suplente:
                    continue

                jugador = None
                for j in jugadores_equipo:
                    nombre_completo = f"{j['nombre']} {j['apellido']}"
                    if nombre_suplente.lower() in nombre_completo.lower():
                        jugador = j
                        break

                if not jugador:
                    errores.append(f"Suplente '{nombre_suplente}' no encontrado")
                    continue

                nueva_alineacion = Alineacion(
                    id_partido=data['id_partido'],
                    id_equipo=data['id_equipo'],
                    id_jugador=jugador['id_jugador'],
                    titular=False,
                    minuto_entrada=None
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
# NUEVO: HACER CAMBIO DURANTE EL PARTIDO
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
        """
        Hace un cambio durante el partido: saca un titular, entra un suplente
        """
        try:
            data = alineacion_ns.payload

            api_client = BackendAPIClient()

            # Validar partido
            partido = api_client.get_partido(data['id_partido'])
            if not partido:
                alineacion_ns.abort(404, error='Partido no encontrado')

            # Validar que el partido esté en estado 'en_juego'
            if partido.get('estado') != 'en_juego':
                alineacion_ns.abort(400, error='Solo se pueden hacer cambios en partidos en juego')

            # Obtener jugadores del equipo
            import requests
            response = requests.get(
                f"{api_client.base_url}/jugadores?id_equipo={data['id_equipo']}",
                timeout=5
            )

            if response.status_code != 200:
                alineacion_ns.abort(500, error='No se pudieron obtener los jugadores')

            jugadores_equipo = response.json().get('jugadores', [])

            # Buscar jugador que SALE
            jugador_sale = None
            for j in jugadores_equipo:
                nombre_completo = f"{j['nombre']} {j['apellido']}"
                if data['sale'].lower() in nombre_completo.lower():
                    jugador_sale = j
                    break

            if not jugador_sale:
                alineacion_ns.abort(404, error=f'Jugador "{data["sale"]}" no encontrado')

            # Buscar jugador que ENTRA
            jugador_entra = None
            for j in jugadores_equipo:
                nombre_completo = f"{j['nombre']} {j['apellido']}"
                if data['entra'].lower() in nombre_completo.lower():
                    jugador_entra = j
                    break

            if not jugador_entra:
                alineacion_ns.abort(404, error=f'Jugador "{data["entra"]}" no encontrado')

            # Buscar alineación del que SALE
            alineacion_sale = Alineacion.query.filter_by(
                id_partido=data['id_partido'],
                id_equipo=data['id_equipo'],
                id_jugador=jugador_sale['id_jugador']
            ).first()

            if not alineacion_sale:
                alineacion_ns.abort(400, error=f'{data["sale"]} no está en la alineación')

            if alineacion_sale.minuto_salida is not None:
                alineacion_ns.abort(400, error=f'{data["sale"]} ya fue sustituido anteriormente')

            # Verificar que el minuto de salida sea mayor que el de entrada
            if alineacion_sale.minuto_entrada is not None and data['minuto'] <= alineacion_sale.minuto_entrada:
                alineacion_ns.abort(400, error='El minuto de salida debe ser mayor al de entrada')

            # Buscar alineación del que ENTRA
            alineacion_entra = Alineacion.query.filter_by(
                id_partido=data['id_partido'],
                id_equipo=data['id_equipo'],
                id_jugador=jugador_entra['id_jugador']
            ).first()

            if not alineacion_entra:
                alineacion_ns.abort(400, error=f'{data["entra"]} no está en la lista de convocados')

            if alineacion_entra.minuto_entrada is not None:
                alineacion_ns.abort(400, error=f'{data["entra"]} ya está en la cancha')

            # Realizar el cambio
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
# NUEVO: AUTO-GENERAR ALINEACIONES (SOLO PARA PRUEBAS RÁPIDAS)
# ============================================
@alineacion_ns.route('/auto-generar')
class AutoGenerarAlineaciones(Resource):
    @alineacion_ns.doc(
        description='Generar automáticamente alineaciones para todos los partidos de un campeonato (SOLO PARA PRUEBAS)',
        security='Bearer',
        responses={
            201: 'Alineaciones generadas exitosamente',
            400: 'Campeonato requerido',
            401: 'No autorizado',
            404: 'Campeonato sin partidos',
            500: 'Error interno del servidor'
        }
    )
    @alineacion_ns.expect(auto_generar_model, validate=True)
    @alineacion_ns.marshal_with(message_response, code=201)
    @jwt_required()
    def post(self):
        """
        Genera automáticamente alineaciones para todos los partidos de un campeonato
        SOLO PARA PRUEBAS - En producción el líder debe definir manualmente
        """
        try:
            import requests
            data = alineacion_ns.payload

            id_campeonato = data['id_campeonato']
            api_client = BackendAPIClient()

            # Obtener todos los partidos del campeonato
            response = requests.get(
                f"{api_client.base_url}/partido?id_campeonato={id_campeonato}",
                timeout=10
            )

            if response.status_code != 200:
                alineacion_ns.abort(500, error='No se pudieron obtener los partidos')

            partidos = response.json().get('partidos', [])

            if not partidos:
                alineacion_ns.abort(404, error='No hay partidos en este campeonato')

            alineaciones_creadas = 0
            partidos_procesados = 0
            errores = []

            for partido in partidos:
                try:
                    id_partido = partido['id_partido']
                    id_equipo_local = partido['id_equipo_local']
                    id_equipo_visitante = partido['id_equipo_visitante']

                    # Procesar equipo local
                    try:
                        response_local = requests.get(
                            f"{api_client.base_url}/jugadores?id_equipo={id_equipo_local}",
                            timeout=5
                        )

                        if response_local.status_code == 200:
                            jugadores_local = response_local.json().get('jugadores', [])

                            # Primeros 5 titulares, resto suplentes
                            for idx, jugador in enumerate(jugadores_local):
                                existe = Alineacion.query.filter_by(
                                    id_partido=id_partido,
                                    id_jugador=jugador['id_jugador']
                                ).first()

                                if not existe:
                                    nueva_alineacion = Alineacion(
                                        id_partido=id_partido,
                                        id_equipo=id_equipo_local,
                                        id_jugador=jugador['id_jugador'],
                                        titular=(idx < 5),
                                        minuto_entrada=0 if idx < 5 else None
                                    )

                                    db.session.add(nueva_alineacion)
                                    alineaciones_creadas += 1
                    except Exception as e:
                        errores.append(f"Partido {id_partido} - Local: {str(e)}")

                    # Procesar equipo visitante
                    try:
                        response_visitante = requests.get(
                            f"{api_client.base_url}/jugadores?id_equipo={id_equipo_visitante}",
                            timeout=5
                        )

                        if response_visitante.status_code == 200:
                            jugadores_visitante = response_visitante.json().get('jugadores', [])

                            for idx, jugador in enumerate(jugadores_visitante):
                                existe = Alineacion.query.filter_by(
                                    id_partido=id_partido,
                                    id_jugador=jugador['id_jugador']
                                ).first()

                                if not existe:
                                    nueva_alineacion = Alineacion(
                                        id_partido=id_partido,
                                        id_equipo=id_equipo_visitante,
                                        id_jugador=jugador['id_jugador'],
                                        titular=(idx < 5),
                                        minuto_entrada=0 if idx < 5 else None
                                    )

                                    db.session.add(nueva_alineacion)
                                    alineaciones_creadas += 1
                    except Exception as e:
                        errores.append(f"Partido {id_partido} - Visitante: {str(e)}")

                    partidos_procesados += 1

                except Exception as e:
                    errores.append(f"Partido {partido.get('id_partido', '?')}: {str(e)}")

            db.session.commit()

            return {
                'mensaje': 'Alineaciones generadas automáticamente',
                'partidos_procesados': partidos_procesados,
                'alineaciones_creadas': alineaciones_creadas,
                'errores': errores if errores else None
            }, 201

        except Exception as e:
            db.session.rollback()
            alineacion_ns.abort(500, error=str(e))


# ============================================
# BATCH (MANTENER PARA COMPATIBILIDAD)
# ============================================
@alineacion_ns.route('/batch')
class CrearAlineacionBatch(Resource):
    @alineacion_ns.doc(
        description='Crear múltiples alineaciones de golpe (DEPRECADO - Usar /definir-alineacion)',
        security='Bearer',
        responses={
            201: 'Alineaciones creadas exitosamente',
            400: 'Datos inválidos',
            401: 'No autorizado',
            404: 'Partido o equipo no encontrado',
            500: 'Error interno del servidor'
        }
    )
    @alineacion_ns.expect(batch_model, validate=True)
    @alineacion_ns.marshal_with(message_response, code=201)
    @jwt_required()
    def post(self):
        """
        Crea múltiples alineaciones de golpe (DEPRECADO - Usar /definir-alineacion)
        """
        try:
            data = alineacion_ns.payload

            api_client = BackendAPIClient()

            # Validar partido
            partido = api_client.get_partido(data['id_partido'])
            if not partido:
                alineacion_ns.abort(404, error='Partido no encontrado')

            # Validar equipo en partido
            if not api_client.validar_equipo_en_partido(data['id_equipo'], data['id_partido']):
                alineacion_ns.abort(400, error='El equipo no participa en este partido')

            # Obtener jugadores del equipo
            import requests
            response = requests.get(
                f"{api_client.base_url}/jugadores?id_equipo={data['id_equipo']}",
                timeout=5
            )

            if response.status_code != 200:
                alineacion_ns.abort(500, error='No se pudieron obtener los jugadores')

            jugadores_equipo = response.json().get('jugadores', [])

            alineaciones_creadas = []
            errores = []

            # Procesar titulares
            for nombre_titular in data.get('titulares', []):
                jugador = None
                for j in jugadores_equipo:
                    nombre_completo = f"{j['nombre']} {j['apellido']}"
                    if nombre_titular.lower() in nombre_completo.lower():
                        jugador = j
                        break

                if not jugador:
                    errores.append(f"Titular '{nombre_titular}' no encontrado")
                    continue

                # Verificar si ya existe
                existe = Alineacion.query.filter_by(
                    id_partido=data['id_partido'],
                    id_jugador=jugador['id_jugador']
                ).first()

                if existe:
                    errores.append(f"{nombre_titular} ya está en la alineación")
                    continue

                nueva_alineacion = Alineacion(
                    id_partido=data['id_partido'],
                    id_equipo=data['id_equipo'],
                    id_jugador=jugador['id_jugador'],
                    titular=True,
                    minuto_entrada=0
                )

                db.session.add(nueva_alineacion)
                alineaciones_creadas.append({
                    'nombre': f"{jugador['nombre']} {jugador['apellido']}",
                    'dorsal': jugador['dorsal'],
                    'posicion': jugador['posicion'],
                    'titular': True
                })

            # Procesar suplentes
            for nombre_suplente in data.get('suplentes', []):
                jugador = None
                for j in jugadores_equipo:
                    nombre_completo = f"{j['nombre']} {j['apellido']}"
                    if nombre_suplente.lower() in nombre_completo.lower():
                        jugador = j
                        break

                if not jugador:
                    errores.append(f"Suplente '{nombre_suplente}' no encontrado")
                    continue

                existe = Alineacion.query.filter_by(
                    id_partido=data['id_partido'],
                    id_jugador=jugador['id_jugador']
                ).first()

                if existe:
                    errores.append(f"{nombre_suplente} ya está en la alineación")
                    continue

                nueva_alineacion = Alineacion(
                    id_partido=data['id_partido'],
                    id_equipo=data['id_equipo'],
                    id_jugador=jugador['id_jugador'],
                    titular=False,
                    minuto_entrada=None
                )

                db.session.add(nueva_alineacion)
                alineaciones_creadas.append({
                    'nombre': f"{jugador['nombre']} {jugador['apellido']}",
                    'dorsal': jugador['dorsal'],
                    'posicion': jugador['posicion'],
                    'titular': False
                })

            db.session.commit()

            return {
                'mensaje': f'{len(alineaciones_creadas)} alineaciones creadas',
                'alineaciones': alineaciones_creadas,
                'errores': errores if errores else None
            }, 201

        except Exception as e:
            db.session.rollback()
            alineacion_ns.abort(500, error=str(e))