from flask import request, jsonify
from flask_restx import Namespace, fields, Resource
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from app.middlewares.auth_middleware import role_required
from app.extensions import db
from app.models.partido import Partido
from app.models.campeonato import Campeonato
from app.models.equipo import Equipo
from app.models.historial_estado import HistorialEstado
from app.models.usuario import Usuario
from app.models.notificacion import Notificacion
from app.routes.respuestas import ApiResponse, PagedApiResponse
from datetime import datetime

partidos_ns = Namespace('partidos', description='Gestión de partidos de fútbol')

# ============================================
# MODELOS SWAGGER
# ============================================

partido_input_model = partidos_ns.model('PartidoInput', {
    'id_campeonato': fields.Integer(required=True, description='ID del campeonato', example=1),
    'id_equipo_local': fields.Integer(required=True, description='ID del equipo local', example=1),
    'id_equipo_visitante': fields.Integer(required=True, description='ID del equipo visitante', example=2),
    'fecha_partido': fields.DateTime(required=True, description='Fecha y hora del partido (ISO format)', example='2024-11-16T15:00:00'),
    'lugar': fields.String(description='Lugar del partido'),
    'jornada': fields.Integer(description='Número de jornada', example=1)
})

partido_update_model = partidos_ns.model('PartidoUpdate', {
    'fecha_partido': fields.DateTime(description='Fecha y hora del partido (ISO format)'),
    'lugar': fields.String(description='Lugar del partido'),
    'jornada': fields.Integer(description='Número de jornada'),
    'observaciones': fields.String(description='Observaciones del partido')
})

partido_estado_model = partidos_ns.model('PartidoEstado', {
    'estado': fields.String(required=True, description='Estado del partido', enum=['programado', 'en_juego', 'finalizado', 'cancelado']),
    'observaciones': fields.String(description='Observaciones')
})

partido_resultado_model = partidos_ns.model('PartidoResultado', {
    'goles_local': fields.Integer(required=True, description='Goles del equipo local', example=2),
    'goles_visitante': fields.Integer(required=True, description='Goles del equipo visitante', example=1)
})

message_response = partidos_ns.model('MessageResponse', {
    'mensaje': fields.String(description='Mensaje de respuesta')
})

partido_reprogramar_model = partidos_ns.model('PartidoReprogramar', {
    'fecha_partido': fields.String(description='Fecha y hora del partido (formato: YYYY-MM-DD HH:MM:SS)', example='2024-11-16 15:00:00'),
    'lugar': fields.String(description='Lugar del partido'),
    'jornada': fields.Integer(description='Número de jornada'),
    'mensaje': fields.String(description='Mensaje opcional que se enviará a los líderes de los equipos')
})

# ============================================
# ENDPOINTS
# ============================================

@partidos_ns.route('')
class PartidoList(Resource):
    @partidos_ns.doc(description='Crear nuevo partido (solo admin)', security='Bearer')
    @partidos_ns.expect(partido_input_model, validate=True)
    @jwt_required()
    @role_required(['admin'])
    def post(self):
        try:
            data = partidos_ns.payload

            if data['id_equipo_local'] == data['id_equipo_visitante']:
                partidos_ns.abort(400, error='Los equipos deben ser diferentes')

            campeonato = Campeonato.query.get(data['id_campeonato'])
            if not campeonato:
                partidos_ns.abort(404, error='Campeonato no encontrado')

            equipo_local = Equipo.query.get(data['id_equipo_local'])
            if not equipo_local:
                partidos_ns.abort(404, error='Equipo local no encontrado')

            equipo_visitante = Equipo.query.get(data['id_equipo_visitante'])
            if not equipo_visitante:
                partidos_ns.abort(404, error='Equipo visitante no encontrado')

            if equipo_local.estado != 'aprobado':
                partidos_ns.abort(400, error='El equipo local no está aprobado')

            if equipo_visitante.estado != 'aprobado':
                partidos_ns.abort(400, error='El equipo visitante no está aprobado')

            nuevo_partido = Partido(
                id_campeonato=data['id_campeonato'],
                id_equipo_local=data['id_equipo_local'],
                id_equipo_visitante=data['id_equipo_visitante'],
                fecha_partido=datetime.fromisoformat(data['fecha_partido']),
                lugar=data.get('lugar'),
                jornada=data.get('jornada', 1),
                estado='programado'
            )

            db.session.add(nuevo_partido)
            db.session.commit()
            
            return {'partido': nuevo_partido.to_dict()}, 201

        except ValueError:
            db.session.rollback()
            partidos_ns.abort(400, error='Formato de fecha inválido. Use formato ISO: YYYY-MM-DDTHH:MM:SS')
        except Exception as e:
            db.session.rollback()
            partidos_ns.abort(500, error=str(e))

    @partidos_ns.doc(
        description='Listar partidos con filtros, búsqueda, ordenación y paginación',
        params={
            'id_campeonato': 'Filtrar por ID del campeonato',
            'estado': 'Filtrar por estado (programado, en_juego, finalizado, cancelado)',
            'jornada': 'Filtrar por número de jornada',
            'id_equipo': 'Filtrar partidos de un equipo específico',
            'fecha_desde': 'Filtrar desde fecha (YYYY-MM-DD)',
            'fecha_hasta': 'Filtrar hasta fecha (YYYY-MM-DD)',
            'buscar': 'Buscar por nombre de equipo o lugar',
            'ordenar_por': 'Ordenar por (fecha_partido, jornada)',
            'orden': 'Orden (asc, desc)',
            'page': 'Número de página (default: 1)',
            'per_page': 'Elementos por página (default: 10, max: 100)'
        }
    )
    def get(self):
        try:
            # Filtros
            id_campeonato = request.args.get('id_campeonato')
            estado = request.args.get('estado')
            jornada = request.args.get('jornada')
            id_equipo = request.args.get('id_equipo')
            fecha_desde = request.args.get('fecha_desde')
            fecha_hasta = request.args.get('fecha_hasta')
            buscar = request.args.get('buscar')
            
            # Ordenación
            ordenar_por = request.args.get('ordenar_por', 'fecha_partido')
            orden = request.args.get('orden', 'desc')
            
            # Paginación
            page = request.args.get('page', 1, type=int)
            per_page = request.args.get('per_page', 10, type=int)
            per_page = min(per_page, 100)

            query = Partido.query

            # Aplicar filtros
            if id_campeonato:
                query = query.filter_by(id_campeonato=int(id_campeonato))
            if estado:
                query = query.filter_by(estado=estado)
            if jornada:
                query = query.filter_by(jornada=int(jornada))
            if id_equipo:
                equipo_id = int(id_equipo)
                query = query.filter(
                    (Partido.id_equipo_local == equipo_id) |
                    (Partido.id_equipo_visitante == equipo_id)
                )
            if fecha_desde:
                fecha = datetime.strptime(fecha_desde, '%Y-%m-%d')
                query = query.filter(Partido.fecha_partido >= fecha)
            if fecha_hasta:
                fecha = datetime.strptime(fecha_hasta, '%Y-%m-%d')
                query = query.filter(Partido.fecha_partido <= fecha)
            if buscar:
                query = query.join(Equipo, Partido.id_equipo_local == Equipo.id_equipo).filter(
                    db.or_(
                        Equipo.nombre.ilike(f'%{buscar}%'),
                        Partido.lugar.ilike(f'%{buscar}%')
                    )
                )

            # Ordenar
            if ordenar_por == 'jornada':
                query = query.order_by(Partido.jornada.desc() if orden == 'desc' else Partido.jornada.asc())
            else:
                query = query.order_by(Partido.fecha_partido.desc() if orden == 'desc' else Partido.fecha_partido.asc())

            # Paginar
            pagination = query.paginate(page=page, per_page=per_page, error_out=False)

            # Construir URL base
            base_url = "/partidos"
            filter_params = []
            if id_campeonato:
                filter_params.append(f"id_campeonato={id_campeonato}")
            if estado:
                filter_params.append(f"estado={estado}")
            if jornada:
                filter_params.append(f"jornada={jornada}")
            if id_equipo:
                filter_params.append(f"id_equipo={id_equipo}")

            full_url = f"{base_url}?{'&'.join(filter_params)}" if filter_params else base_url

            response = PagedApiResponse.ok(
                message="Partidos obtenidos exitosamente",
                data={"partidos": [p.to_dict() for p in pagination.items]},
                page=pagination.page,
                per_page=pagination.per_page,
                total_items=pagination.total,
                total_pages=pagination.pages
            )
            
            response.add_pagination_links(full_url)
            return jsonify(response.to_dict())

        except Exception as e:
            error_response = ApiResponse.internal_server_error(
                message="Error al obtener partidos",
                data={"error": str(e)}
            )
            return jsonify(error_response.to_dict()), 500


@partidos_ns.route('/<int:id_partido>')
@partidos_ns.param('id_partido', 'ID del partido')
class PartidoDetail(Resource):
    @partidos_ns.doc(description='Obtener detalles de un partido específico')
    def get(self, id_partido):
        """🔥 ENDPOINT CORREGIDO - SIN MARSHAL_WITH - SIN JSONIFY"""
        try:
            partido = Partido.query.get(id_partido)
            if not partido:
                partidos_ns.abort(404, error='Partido no encontrado')
            
            # 🔥 DEBUG
            print("=" * 80)
            print(f"🔍 PARTIDO ID: {id_partido}")
            
            if hasattr(partido, 'campeonato') and partido.campeonato:
                print(f"✅ Campeonato: {partido.campeonato.nombre}")
                print(f"⚽ Tipo deporte: {partido.campeonato.tipo_deporte}")
            
            print(f"🏠 Equipo Local: {partido.equipo_local.nombre if partido.equipo_local else 'N/A'}")
            print(f"✈️ Equipo Visitante: {partido.equipo_visitante.nombre if partido.equipo_visitante else 'N/A'}")
            
            partido_dict = partido.to_dict()
            print(f"📤 Datos que se envían:")
            print(f"   - Campeonato: {partido_dict.get('campeonato')}")
            print(f"   - Equipo Local: {partido_dict.get('equipo_local')}")
            print(f"   - Equipo Visitante: {partido_dict.get('equipo_visitante')}")
            print("=" * 80)
            
            # ✅ SIN JSONIFY - Flask-RESTX maneja la serialización
            return {'partido': partido_dict}, 200
            
        except Exception as e:
            print(f"❌ ERROR: {str(e)}")
            import traceback
            traceback.print_exc()
            partidos_ns.abort(500, error=str(e))

    @partidos_ns.doc(description='Actualizar partido (solo admin, no si resultado registrado)', security='Bearer')
    @partidos_ns.expect(partido_update_model, validate=True)
    @jwt_required()
    @role_required(['admin'])
    def put(self, id_partido):
        try:
            partido = Partido.query.get(id_partido)
            if not partido:
                partidos_ns.abort(404, error='Partido no encontrado')

            if partido.resultado_registrado:
                partidos_ns.abort(400, error='No se puede modificar un partido con resultado registrado (inmutable)')

            data = partidos_ns.payload

            if 'fecha_partido' in data:
                partido.fecha_partido = datetime.fromisoformat(data['fecha_partido'])
            if 'lugar' in data:
                partido.lugar = data['lugar']
            if 'jornada' in data:
                partido.jornada = int(data['jornada'])
            if 'observaciones' in data:
                partido.observaciones = data['observaciones']

            db.session.commit()
            return {'partido': partido.to_dict()}, 200

        except ValueError:
            db.session.rollback()
            partidos_ns.abort(400, error='Formato de fecha inválido')
        except Exception as e:
            db.session.rollback()
            partidos_ns.abort(500, error=str(e))

    @partidos_ns.doc(description='Eliminar partido (solo admin)', security='Bearer')
    @jwt_required()
    @role_required(['admin'])
    def delete(self, id_partido):
        try:
            partido = Partido.query.get(id_partido)
            if not partido:
                partidos_ns.abort(404, error='Partido no encontrado')

            if partido.estado != 'programado':
                partidos_ns.abort(400, error='Solo se pueden eliminar partidos programados')

            db.session.delete(partido)
            db.session.commit()

            return {'mensaje': 'Partido eliminado exitosamente'}, 200

        except Exception as e:
            db.session.rollback()
            partidos_ns.abort(500, error=str(e))


@partidos_ns.route('/<int:id_partido>/estado')
@partidos_ns.param('id_partido', 'ID del partido')
class PartidoEstado(Resource):
    @partidos_ns.doc(description='Cambiar estado del partido (admin o creador del campeonato)', security='Bearer')
    @partidos_ns.expect(partido_estado_model, validate=True)
    @jwt_required()
    def patch(self, id_partido):
        try:
            partido = Partido.query.get(id_partido)
            if not partido:
                partidos_ns.abort(404, error='Partido no encontrado')

            data = partidos_ns.payload
            current_user_id = get_jwt_identity()
            
            campeonato = Campeonato.query.get(partido.id_campeonato)
            if not campeonato:
                partidos_ns.abort(404, error='Campeonato no encontrado')
            
            claims = get_jwt()
            user_rol = claims.get('rol')
            
            if user_rol not in ['superadmin', 'admin'] and campeonato.creado_por != int(current_user_id):
                partidos_ns.abort(403, error='No tienes permisos para cambiar el estado de este partido')

            estados_validos = ['programado', 'en_juego', 'finalizado', 'cancelado']
            if data['estado'] not in estados_validos:
                partidos_ns.abort(400, error=f'Estado no válido. Debe ser: {", ".join(estados_validos)}')

            historial = HistorialEstado(
                tipo_entidad='partido',
                id_entidad=id_partido,
                estado_anterior=partido.estado,
                estado_nuevo=data['estado'],
                cambiado_por=int(current_user_id),
                observaciones=data.get('observaciones')
            )
            db.session.add(historial)

            partido.estado = data['estado']
            db.session.commit()

            return {'partido': partido.to_dict()}, 200

        except Exception as e:
            db.session.rollback()
            print(f"❌ Error al cambiar estado: {str(e)}")
            partidos_ns.abort(500, error=str(e))


@partidos_ns.route('/<int:id_partido>/resultado')
@partidos_ns.param('id_partido', 'ID del partido')
class PartidoResultado(Resource):
    @partidos_ns.doc(description='Registrar resultado FINAL (INMUTABLE una vez guardado)', security='Bearer')
    @partidos_ns.expect(partido_resultado_model, validate=True)
    @jwt_required()
    @role_required(['admin'])
    def patch(self, id_partido):
        try:
            partido = Partido.query.get(id_partido)
            if not partido:
                partidos_ns.abort(404, error='Partido no encontrado')

            if partido.resultado_registrado:
                partidos_ns.abort(400, error='El resultado ya fue registrado y es INMUTABLE. No se puede modificar.')

            data = partidos_ns.payload
            current_user_id = get_jwt_identity()

            partido.goles_local = int(data['goles_local'])
            partido.goles_visitante = int(data['goles_visitante'])
            partido.estado = 'finalizado'
            partido.resultado_registrado = True
            partido.registrado_por = int(current_user_id)
            partido.fecha_registro_resultado = datetime.utcnow()

            db.session.commit()

            return {'partido': partido.to_dict()}, 200

        except Exception as e:
            db.session.rollback()
            partidos_ns.abort(500, error=str(e))


@partidos_ns.route('/<int:id_partido>/finalizar')
@partidos_ns.param('id_partido', 'ID del partido')
class PartidoFinalizar(Resource):
    @partidos_ns.doc(description='Finalizar partido (admin o creador del campeonato)', security='Bearer')
    @partidos_ns.expect(partido_resultado_model, validate=True)
    @jwt_required()
    def post(self, id_partido):
        try:
            partido = Partido.query.get(id_partido)
            if not partido:
                partidos_ns.abort(404, error='Partido no encontrado')
            
            current_user_id = get_jwt_identity()
            
            campeonato = Campeonato.query.get(partido.id_campeonato)
            if not campeonato:
                partidos_ns.abort(404, error='Campeonato no encontrado')
            
            claims = get_jwt()
            user_rol = claims.get('rol')
            
            if user_rol not in ['superadmin', 'admin'] and campeonato.creado_por != int(current_user_id):
                partidos_ns.abort(403, error='No tienes permisos para finalizar este partido')
            
            if partido.resultado_registrado:
                partidos_ns.abort(400, error='El resultado ya fue registrado y es INMUTABLE')
            
            if partido.estado == 'finalizado':
                partidos_ns.abort(400, error='El partido ya está finalizado')
            
            if partido.estado == 'cancelado':
                partidos_ns.abort(400, error='No se puede finalizar un partido cancelado')
            
            data = partidos_ns.payload
            
            partido.goles_local = int(data['goles_local'])
            partido.goles_visitante = int(data['goles_visitante'])
            partido.estado = 'finalizado'
            partido.resultado_registrado = True
            partido.registrado_por = int(current_user_id)
            partido.fecha_registro_resultado = datetime.utcnow()
            
            historial = HistorialEstado(
                tipo_entidad='partido',
                id_entidad=id_partido,
                estado_anterior=partido.estado,
                estado_nuevo='finalizado',
                cambiado_por=int(current_user_id),
                observaciones=f'Resultado final: {partido.goles_local} - {partido.goles_visitante}'
            )
            db.session.add(historial)
            
            db.session.commit()
            
            return {'partido': partido.to_dict()}, 200
            
        except Exception as e:
            db.session.rollback()
            print(f"❌ Error al finalizar partido: {str(e)}")
            partidos_ns.abort(500, error=str(e))


@partidos_ns.route('/<int:id_partido>/historial')
@partidos_ns.param('id_partido', 'ID del partido')
class PartidoHistorial(Resource):
    @partidos_ns.doc(description='Obtener historial de cambios del partido')
    def get(self, id_partido):
        try:
            partido = Partido.query.get(id_partido)
            if not partido:
                partidos_ns.abort(404, error='Partido no encontrado')

            historial = HistorialEstado.query.filter_by(
                tipo_entidad='partido',
                id_entidad=id_partido
            ).order_by(HistorialEstado.fecha_cambio.desc()).all()

            return {
                'partido': f"{partido.equipo_local.nombre} vs {partido.equipo_visitante.nombre}",
                'total_cambios': len(historial),
                'historial': [h.to_dict() for h in historial]
            }, 200

        except Exception as e:
            partidos_ns.abort(500, error=str(e))


@partidos_ns.route('/campeonatos/<int:id_campeonato>/tabla-posiciones')
@partidos_ns.param('id_campeonato', 'ID del campeonato')
class TablaPosiciones(Resource):
    @partidos_ns.doc(
        description='Obtener tabla de posiciones con filtros',
        params={
            'hasta_jornada': 'Calcular tabla hasta esta jornada (opcional)',
            'id_equipo': 'Obtener historial detallado de un equipo (opcional)'
        }
    )
    def get(self, id_campeonato):
        try:
            hasta_jornada = request.args.get('hasta_jornada', type=int)
            id_equipo = request.args.get('id_equipo', type=int)
            
            campeonato = Campeonato.query.get(id_campeonato)
            if not campeonato:
                partidos_ns.abort(404, error='Campeonato no encontrado')
            
            query = Partido.query.filter_by(
                id_campeonato=id_campeonato,
                estado='finalizado'
            )
            
            if hasta_jornada:
                query = query.filter(Partido.jornada <= hasta_jornada)
            
            partidos = query.all()
            
            tabla = {}
            partidos_por_equipo = {}
            
            for partido in partidos:
                if partido.id_equipo_local not in tabla:
                    tabla[partido.id_equipo_local] = {
                        'id_equipo': partido.id_equipo_local,
                        'nombre': partido.equipo_local.nombre if partido.equipo_local else 'Equipo Local',
                        'partidos_jugados': 0,
                        'ganados': 0,
                        'empatados': 0,
                        'perdidos': 0,
                        'goles_favor': 0,
                        'goles_contra': 0,
                        'diferencia_goles': 0,
                        'puntos': 0
                    }
                    partidos_por_equipo[partido.id_equipo_local] = {
                        'victorias': [],
                        'empates': [],
                        'derrotas': []
                    }
                
                if partido.id_equipo_visitante not in tabla:
                    tabla[partido.id_equipo_visitante] = {
                        'id_equipo': partido.id_equipo_visitante,
                        'nombre': partido.equipo_visitante.nombre if partido.equipo_visitante else 'Equipo Visitante',
                        'partidos_jugados': 0,
                        'ganados': 0,
                        'empatados': 0,
                        'perdidos': 0,
                        'goles_favor': 0,
                        'goles_contra': 0,
                        'diferencia_goles': 0,
                        'puntos': 0
                    }
                    partidos_por_equipo[partido.id_equipo_visitante] = {
                        'victorias': [],
                        'empates': [],
                        'derrotas': []
                    }
                
                local = tabla[partido.id_equipo_local]
                visitante = tabla[partido.id_equipo_visitante]
                
                local['partidos_jugados'] += 1
                visitante['partidos_jugados'] += 1
                
                local['goles_favor'] += partido.goles_local
                local['goles_contra'] += partido.goles_visitante
                visitante['goles_favor'] += partido.goles_visitante
                visitante['goles_contra'] += partido.goles_local
                
                partido_info = {
                    'id_partido': partido.id_partido,
                    'jornada': partido.jornada,
                    'fecha': partido.fecha_partido.isoformat() if partido.fecha_partido else None,
                    'rival': None,
                    'resultado': None,
                    'goles_favor': None,
                    'goles_contra': None,
                    'local': None
                }
                
                if partido.goles_local > partido.goles_visitante:
                    local['ganados'] += 1
                    local['puntos'] += 3
                    visitante['perdidos'] += 1
                    
                    partidos_por_equipo[partido.id_equipo_local]['victorias'].append({
                        **partido_info,
                        'rival': visitante['nombre'],
                        'resultado': f"{partido.goles_local}-{partido.goles_visitante}",
                        'goles_favor': partido.goles_local,
                        'goles_contra': partido.goles_visitante,
                        'local': True
                    })
                    
                    partidos_por_equipo[partido.id_equipo_visitante]['derrotas'].append({
                        **partido_info,
                        'rival': local['nombre'],
                        'resultado': f"{partido.goles_visitante}-{partido.goles_local}",
                        'goles_favor': partido.goles_visitante,
                        'goles_contra': partido.goles_local,
                        'local': False
                    })
                    
                elif partido.goles_local < partido.goles_visitante:
                    visitante['ganados'] += 1
                    visitante['puntos'] += 3
                    local['perdidos'] += 1
                    
                    partidos_por_equipo[partido.id_equipo_visitante]['victorias'].append({
                        **partido_info,
                        'rival': local['nombre'],
                        'resultado': f"{partido.goles_visitante}-{partido.goles_local}",
                        'goles_favor': partido.goles_visitante,
                        'goles_contra': partido.goles_local,
                        'local': False
                    })
                    
                    partidos_por_equipo[partido.id_equipo_local]['derrotas'].append({
                        **partido_info,
                        'rival': visitante['nombre'],
                        'resultado': f"{partido.goles_local}-{partido.goles_visitante}",
                        'goles_favor': partido.goles_local,
                        'goles_contra': partido.goles_visitante,
                        'local': True
                    })
                    
                else:
                    local['empatados'] += 1
                    local['puntos'] += 1
                    visitante['empatados'] += 1
                    visitante['puntos'] += 1
                    
                    partido_empate_local = {
                        **partido_info,
                        'rival': visitante['nombre'],
                        'resultado': f"{partido.goles_local}-{partido.goles_visitante}",
                        'goles_favor': partido.goles_local,
                        'goles_contra': partido.goles_visitante,
                        'local': True
                    }
                    
                    partido_empate_visitante = {
                        **partido_info,
                        'rival': local['nombre'],
                        'resultado': f"{partido.goles_visitante}-{partido.goles_local}",
                        'goles_favor': partido.goles_visitante,
                        'goles_contra': partido.goles_local,
                        'local': False
                    }
                    
                    partidos_por_equipo[partido.id_equipo_local]['empates'].append(partido_empate_local)
                    partidos_por_equipo[partido.id_equipo_visitante]['empates'].append(partido_empate_visitante)
            
            for equipo in tabla.values():
                equipo['diferencia_goles'] = equipo['goles_favor'] - equipo['goles_contra']
            
            tabla_ordenada = sorted(
                tabla.values(),
                key=lambda x: (x['puntos'], x['diferencia_goles'], x['goles_favor']),
                reverse=True
            )
            
            for idx, equipo in enumerate(tabla_ordenada, start=1):
                equipo['posicion'] = idx
            
            if id_equipo:
                if id_equipo in partidos_por_equipo and id_equipo in tabla:
                    return {
                        'equipo': tabla.get(id_equipo),
                        'historial': partidos_por_equipo[id_equipo],
                        'total_victorias': len(partidos_por_equipo[id_equipo]['victorias']),
                        'total_empates': len(partidos_por_equipo[id_equipo]['empates']),
                        'total_derrotas': len(partidos_por_equipo[id_equipo]['derrotas'])
                    }, 200
                else:
                    return {
                        'equipo': None,
                        'historial': {
                            'victorias': [],
                            'empates': [],
                            'derrotas': []
                        },
                        'total_victorias': 0,
                        'total_empates': 0,
                        'total_derrotas': 0
                    }, 200
            
            jornada_max = max([p.jornada for p in Partido.query.filter_by(id_campeonato=id_campeonato).all()]) if Partido.query.filter_by(id_campeonato=id_campeonato).count() > 0 else 0
            
            return {
                'campeonato': campeonato.to_dict(),
                'total_equipos': len(tabla_ordenada),
                'total_partidos_jugados': len(partidos),
                'jornada_actual': hasta_jornada if hasta_jornada else jornada_max,
                'jornada_maxima': jornada_max,
                'tabla': tabla_ordenada
            }, 200
            
        except Exception as e:
            print(f"❌ Error al obtener tabla de posiciones: {str(e)}")
            import traceback
            traceback.print_exc()
            partidos_ns.abort(500, error=str(e))


@partidos_ns.route('/campeonatos/<int:id_campeonato>/goleadores')
@partidos_ns.param('id_campeonato', 'ID del campeonato')
class TablaGoleadores(Resource):
    @partidos_ns.doc(
        description='Obtener tabla de goleadores del campeonato',
        params={
            'limit': 'Limitar número de resultados (opcional)'
        }
    )
    def get(self, id_campeonato):
        try:
            campeonato = Campeonato.query.get(id_campeonato)
            if not campeonato:
                partidos_ns.abort(404, error='Campeonato no encontrado')
            
            limit = request.args.get('limit', type=int)
            
            partidos = Partido.query.filter_by(
                id_campeonato=id_campeonato,
                estado='finalizado'
            ).all()
            
            goleadores = {}
            
            for partido in partidos:
                if partido.goles_local > 0:
                    equipo_local = partido.equipo_local.nombre if partido.equipo_local else 'Equipo Local'
                    jugador_key = f"{equipo_local} - Delantero"
                    if jugador_key not in goleadores:
                        goleadores[jugador_key] = {
                            'jugador': 'Delantero Principal',
                            'equipo': equipo_local,
                            'goles': 0,
                            'partidos_jugados': 0,
                            'promedio_goles': 0.0
                        }
                    goleadores[jugador_key]['goles'] += partido.goles_local
                    goleadores[jugador_key]['partidos_jugados'] += 1
                
                if partido.goles_visitante > 0:
                    equipo_visitante = partido.equipo_visitante.nombre if partido.equipo_visitante else 'Equipo Visitante'
                    jugador_key = f"{equipo_visitante} - Delantero"
                    if jugador_key not in goleadores:
                        goleadores[jugador_key] = {
                            'jugador': 'Delantero Principal',
                            'equipo': equipo_visitante,
                            'goles': 0,
                            'partidos_jugados': 0,
                            'promedio_goles': 0.0
                        }
                    goleadores[jugador_key]['goles'] += partido.goles_visitante
                    goleadores[jugador_key]['partidos_jugados'] += 1
            
            for goleador in goleadores.values():
                if goleador['partidos_jugados'] > 0:
                    goleador['promedio_goles'] = round(goleador['goles'] / goleador['partidos_jugados'], 2)
            
            tabla_goleadores = sorted(
                goleadores.values(),
                key=lambda x: (x['goles'], x['promedio_goles']),
                reverse=True
            )
            
            for idx, goleador in enumerate(tabla_goleadores, start=1):
                goleador['posicion'] = idx
            
            if limit:
                tabla_goleadores = tabla_goleadores[:limit]
            
            return {
                'campeonato': campeonato.to_dict(),
                'total_goleadores': len(tabla_goleadores),
                'goleadores': tabla_goleadores,
                'nota': 'Datos simulados. Se actualizarán cuando el sistema de alineaciones esté disponible.'
            }, 200
            
        except Exception as e:
            print(f"❌ Error al obtener goleadores: {str(e)}")
            import traceback
            traceback.print_exc()
            partidos_ns.abort(500, error=str(e))


@partidos_ns.route('/campeonatos/<int:id_campeonato>/asistencias')
@partidos_ns.param('id_campeonato', 'ID del campeonato')
class TablaAsistencias(Resource):
    @partidos_ns.doc(
        description='Obtener tabla de asistencias del campeonato',
        params={
            'limit': 'Limitar número de resultados (opcional)'
        }
    )
    def get(self, id_campeonato):
        try:
            campeonato = Campeonato.query.get(id_campeonato)
            if not campeonato:
                partidos_ns.abort(404, error='Campeonato no encontrado')
            
            limit = request.args.get('limit', type=int)
            
            partidos = Partido.query.filter_by(
                id_campeonato=id_campeonato,
                estado='finalizado'
            ).all()
            
            asistidores = {}
            
            for partido in partidos:
                if partido.goles_local > 0:
                    equipo_local = partido.equipo_local.nombre if partido.equipo_local else 'Equipo Local'
                    jugador_key = f"{equipo_local} - Mediocampista"
                    if jugador_key not in asistidores:
                        asistidores[jugador_key] = {
                            'jugador': 'Mediocampista Principal',
                            'equipo': equipo_local,
                            'asistencias': 0,
                            'partidos_jugados': 0,
                            'promedio_asistencias': 0.0
                        }
                    asistencias_estimadas = max(1, int(partido.goles_local * 0.7))
                    asistidores[jugador_key]['asistencias'] += asistencias_estimadas
                    asistidores[jugador_key]['partidos_jugados'] += 1
                
                if partido.goles_visitante > 0:
                    equipo_visitante = partido.equipo_visitante.nombre if partido.equipo_visitante else 'Equipo Visitante'
                    jugador_key = f"{equipo_visitante} - Mediocampista"
                    if jugador_key not in asistidores:
                        asistidores[jugador_key] = {
                            'jugador': 'Mediocampista Principal',
                            'equipo': equipo_visitante,
                            'asistencias': 0,
                            'partidos_jugados': 0,
                            'promedio_asistencias': 0.0
                        }
                    asistencias_estimadas = max(1, int(partido.goles_visitante * 0.7))
                    asistidores[jugador_key]['asistencias'] += asistencias_estimadas
                    asistidores[jugador_key]['partidos_jugados'] += 1
            
            for asistidor in asistidores.values():
                if asistidor['partidos_jugados'] > 0:
                    asistidor['promedio_asistencias'] = round(asistidor['asistencias'] / asistidor['partidos_jugados'], 2)
            
            tabla_asistencias = sorted(
                asistidores.values(),
                key=lambda x: (x['asistencias'], x['promedio_asistencias']),
                reverse=True
            )
            
            for idx, asistidor in enumerate(tabla_asistencias, start=1):
                asistidor['posicion'] = idx
            
            if limit:
                tabla_asistencias = tabla_asistencias[:limit]
            
            return {
                'campeonato': campeonato.to_dict(),
                'total_asistidores': len(tabla_asistencias),
                'asistidores': tabla_asistencias,
                'nota': 'Datos simulados. Se actualizarán cuando el sistema de eventos esté disponible.'
            }, 200
            
        except Exception as e:
            print(f"❌ Error al obtener asistencias: {str(e)}")
            import traceback
            traceback.print_exc()
            partidos_ns.abort(500, error=str(e))


@partidos_ns.route('/<int:id_partido>/reprogramar')
@partidos_ns.param('id_partido', 'ID del partido')
class ReprogramarPartido(Resource):
    @partidos_ns.doc(description='Reprograma un partido', security='Bearer')
    @partidos_ns.expect(partido_reprogramar_model)
    @jwt_required()
    def patch(self, id_partido):
        try:
            identity = get_jwt_identity()
            usuario = Usuario.query.get(identity['id_usuario'])
            
            if not usuario or usuario.rol not in ['admin', 'superadmin']:
                partidos_ns.abort(403, error='No autorizado')
            
            partido = Partido.query.get(id_partido)
            if not partido:
                partidos_ns.abort(404, error='Partido no encontrado')
            
            if partido.estado == 'finalizado':
                partidos_ns.abort(400, error='No se puede reprogramar un partido finalizado')
            
            data = partidos_ns.payload
            
            fecha_anterior = partido.fecha_partido
            fecha_cambiada = False
            
            if 'fecha_partido' in data:
                try:
                    nueva_fecha = datetime.strptime(data['fecha_partido'], '%Y-%m-%d %H:%M:%S')
                    if nueva_fecha != fecha_anterior:
                        fecha_cambiada = True
                        partido.fecha_partido = nueva_fecha
                except ValueError:
                    partidos_ns.abort(400, error='Formato de fecha inválido. Use: YYYY-MM-DD HH:MM:SS')
            
            lugar_cambiado = False
            if 'lugar' in data and data['lugar'] != partido.lugar:
                lugar_cambiado = True
                partido.lugar = data['lugar']
            
            if 'jornada' in data:
                partido.jornada = data['jornada']
            
            if 'observaciones' in data:
                partido.observaciones = data.get('observaciones')
            
            if fecha_cambiada or lugar_cambiado:
                equipo_local = Equipo.query.get(partido.id_equipo_local)
                equipo_visitante = Equipo.query.get(partido.id_equipo_visitante)
                
                if equipo_local and equipo_visitante:
                    mensaje_notificacion = data.get('mensaje', '')
                    
                    fecha_str = partido.fecha_partido.strftime('%d/%m/%Y')
                    hora_str = partido.fecha_partido.strftime('%H:%M')
                    lugar_str = partido.lugar or 'Por definir'
                    
                    titulo = 'Partido Reprogramado'
                    mensaje_base = f'El partido entre {equipo_local.nombre} y {equipo_visitante.nombre} ha sido reprogramado.\n\n'
                    mensaje_base += f'Nueva fecha: {fecha_str}\n'
                    mensaje_base += f'Nueva hora: {hora_str}\n'
                    mensaje_base += f'Lugar: {lugar_str}\n'
                    
                    if mensaje_notificacion:
                        mensaje_base += f'\nMensaje del organizador:\n{mensaje_notificacion}'
                    
                    if equipo_local.id_lider:
                        notificacion_local = Notificacion(
                            id_usuario=equipo_local.id_lider,
                            titulo=titulo,
                            mensaje=mensaje_base,
                            tipo='warning',
                            id_campeonato=partido.id_campeonato,
                            id_partido=partido.id_partido,
                            id_equipo=equipo_local.id_equipo
                        )
                        db.session.add(notificacion_local)
                    
                    if equipo_visitante.id_lider:
                        notificacion_visitante = Notificacion(
                            id_usuario=equipo_visitante.id_lider,
                            titulo=titulo,
                            mensaje=mensaje_base,
                            tipo='warning',
                            id_campeonato=partido.id_campeonato,
                            id_partido=partido.id_partido,
                            id_equipo=equipo_visitante.id_equipo
                        )
                        db.session.add(notificacion_visitante)
            
            db.session.commit()
            
            return {
                'mensaje': 'Partido reprogramado exitosamente',
                'partido': partido.to_dict(),
                'notificaciones_enviadas': fecha_cambiada or lugar_cambiado
            }, 200
            
        except Exception as e:
            db.session.rollback()
            partidos_ns.abort(500, error=str(e))