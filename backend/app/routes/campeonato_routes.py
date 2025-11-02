from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.middlewares.auth_middleware import role_required
from app.extensions import db
from app.models.campeonato import Campeonato
from app.models.usuario import Usuario
from itertools import combinations
from datetime import datetime, timedelta

# Crear el blueprint
campeonato_bp = Blueprint('campeonatos', __name__)

"""@campeonato_bp.route('', methods=['POST'])
@jwt_required()
@role_required(['admin'])
def crear_campeonato(): 
    try: 
        data = request.get_json()
        if not data.get('nombre'):
            return jsonify({'error':'El nombre es obligatorio'}),400
        if not data.get('fecha_inicio'):
            return jsonify({'error':'la fecha de inicio es obligatoria'}), 400
        campeonato_existente = Campeonato.query.filter_by(nombre=data['nombre']).first()
        if campeonato_existente:
            return jsonify({'error': 'Ya existe un campeonato con este nombre'}), 400
        current_user = get_jwt_identity()

        nuevo_campeonato = Campeonato(
            nombre=data['nombre'],
            descripcion=data.get('descripcion'),
            fecha_inicio=datetime.fromisoformat(data['fecha_inicio']).date(),
            fecha_fin=datetime.fromisoformat(data['fecha_fin']).date() if data.get('fecha_fin') else None, 
            creado_por=current_user['id_usuario'],
            estado='planificacion'
        )
        db.session.add(nuevo_campeonato)
        db.session.commit()
        return jsonify({
            'mensaje': 'Campeonato creado exitosamente',
            'campeonato': nuevo_campeonato.to_dict()
        }),201

    except ValueError:
        return jsonify({'error': 'Formato de fecha invalido. Usa YYYY-MM-DD'}),400
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500"""

## CORRECION DEL CREAR CAMPEONATO
@campeonato_bp.route('', methods=['POST'])
@jwt_required()
@role_required(['admin'])
def crear_campeonato(): 
    try: 
        data = request.get_json()
        if not data.get('nombre'):
            return jsonify({'error':'El nombre es obligatorio'}),400
        if not data.get('fecha_inicio'):
            return jsonify({'error':'la fecha de inicio es obligatoria'}), 400

        campeonato_existente = Campeonato.query.filter_by(nombre=data['nombre']).first()
        if campeonato_existente:
            return jsonify({'error': 'Ya existe un campeonato con este nombre'}), 400

        # ✅ Corrección aquí
        current_user_id = get_jwt_identity()

        nuevo_campeonato = Campeonato(
            nombre=data['nombre'],
            descripcion=data.get('descripcion'),
            fecha_inicio=datetime.fromisoformat(data['fecha_inicio']).date(),
            fecha_fin=datetime.fromisoformat(data['fecha_fin']).date() if data.get('fecha_fin') else None,
            creado_por=int(current_user_id),
            estado='planificacion'
        )

        db.session.add(nuevo_campeonato)
        db.session.commit()
        return jsonify({
            'mensaje': 'Campeonato creado exitosamente',
            'campeonato': nuevo_campeonato.to_dict()
        }), 201

    except ValueError:
        return jsonify({'error': 'Formato de fecha invalido. Usa YYYY-MM-DD'}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

    
@campeonato_bp.route('', methods=['GET'])
def obtener_campeonatos():
    try:
        estado = request.args.get('estado')
        creado_por = request.args.get('creado_por')
        
        query = Campeonato.query
        if estado:
            query = query.filter_by(estado=estado)
        if creado_por:
            query = query.filter_by(creado_por=int(creado_por))
        campeonatos = query.order_by(Campeonato.fecha_creacion.desc()).all()
        return jsonify({
            'campeonatos': [c.to_dict() for c in campeonatos]
        }), 200
    except Exception as e:
        return jsonify({'error':str(e)}), 500

@campeonato_bp.route('/<int:id_campeonato>', methods=['GET'])
def obtener_campeonato_por_id(id_campeonato):
    try:
        campeonato = Campeonato.query.get(id_campeonato)
        if not campeonato:
            return jsonify({'error': 'Campeonato no encontrado'}),404
        return jsonify({
            'campeonato': campeonato.to_dict()
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@campeonato_bp.route('/<int:id_campeonato>', methods=['PUT'])
@jwt_required()
@role_required(['admin'])
def actualizar_campeonato(id_campeonato):
    try:
        campeonato = Campeonato.query.get(id_campeonato)
        if not campeonato:
            return jsonify({'error': 'Campeonato no encontrado'}), 404
        data = request.get_json()
        if 'nombre' in data:
            existe = Campeonato.query.filter_by(nombre=data['nombre']).first()
            if existe and existe.id_campeonato != id_campeonato:
                return jsonify({'error':'Ya existe un campeonato con este nombre'}), 400
            campeonato.nombre = data['nombre']   
        if 'descripcion' in data:
            campeonato.descripcion = data['descripcion']
        if 'fecha_inicio' in data:
            campeonato.fecha_inicio = datetime.fromisoformat(data['fecha_inicio']).date()
        if 'fecha_fin' in data:
            campeonato.fecha_fin = datetime.fromisoformat(data['fecha_fin']).date() if data['fecha_fin'] else None
        
        db.session.commit()
        return jsonify({
            'mensaje': 'Campeonato actualizado',
            'campeonato': campeonato.to_dict()
        }), 200
    except ValueError:
        return jsonify({'error': 'Formato de fecha invalido, Usa YYYY-MM-DD'}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}),500

@campeonato_bp.route('/<int:id_campeonato>/estado', methods=['PATCH'])
@jwt_required()
@role_required(['admin'])
def cambiar_estado_campeonato(id_campeonato):
    try:
        campeonato = Campeonato.query.get(id_campeonato)
        if not campeonato:
            return jsonify({'error': 'Campeonato no encontrado'}), 404
        data = request.get_json()
        if 'estado' not in data:
            return jsonify({'error': 'El campo estado es requerido'}), 400
        estados_validos = ['planificacion', 'en_curso','finalizado']
        if data['estado'] not in estados_validos:
            return jsonify({
                'error': f'Estado no valido. Debe ser uno de:{",".join(estados_validos)}'

            }), 400
        campeonato.estado = data['estado']
        db.session.commit()

        return jsonify({
            'mensaje': f'Campeonato cambió a estado: {data["estado"]}',
            'campeonato': campeonato.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}),500

@campeonato_bp.route('/<int:id_campeonato>', methods=['DELETE'])
@jwt_required()
@role_required(['admin'])
def eliminar_campeonato(id_campeonato):
    try:
        campeonato = Campeonato.query.get(id_campeonato)
        if not campeonato:
            return jsonify({'error': 'Campeonato no encontrado'}), 404
        if campeonato.partidos.count() > 0:
            return jsonify({
                'error': 'No se puede eliminar un campeonato que tiene partidos programados'
            }), 400
        db.session.delete(campeonato)
        db.session.commit()
        return jsonify({
            'mensaje':'Campeonato eliminado exitosamente'
        }), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({
            'error': str(e)
        }), 500

@campeonato_bp.route('/<int:id_campeonato>/partidos', methods=['GET'])
def obtener_partidos_campeonato(id_campeonato):
    try:
        campeonato = Campeonato.query.get(id_campeonato)
        if not campeonato:
            return jsonify({
                'error': 'Campeonato no encontrado'
            }), 404
        partidos = campeonato.partidos.all()
        return jsonify({
            'campeonato': campeonato.nombre,
            'total_partidos': len(partidos),
            'partidos': [p.to_dict() for p in partidos]
        }), 200
    except Exception as e:
        return jsonify({
            'error': str(e)
        }), 500

campeonato_bp.route('/<int:id_campeonato>/generar-partidos', methods=['POST'])
@jwt_required()
@role_required(['admin'])
def generar_partidos(id_campeonato):
    """
    Genera automáticamente todos los partidos del campeonato
    
    Body:
        {
            "fecha_inicio": "2024-11-16",
            "dias_entre_jornadas": 7,
            "hora_inicio": "15:00",
            "hora_segundo_partido": "17:00",
            "incluir_vuelta": true
        }
    
    Returns:
        201: Partidos generados
        400: Error de validación
    """
    try:
        campeonato = Campeonato.query.get(id_campeonato)
        if not campeonato:
            return jsonify({'error': 'Campeonato no encontrado'}), 404
        
        # Verificar si ya se generaron partidos
        if campeonato.partidos_generados:
            return jsonify({
                'error': 'Los partidos ya fueron generados para este campeonato',
                'mensaje': 'Si deseas regenerarlos, primero elimina los partidos existentes'
            }), 400
        
        data = request.get_json()
        
        # Validaciones
        if not data.get('fecha_inicio'):
            return jsonify({'error': 'La fecha de inicio es obligatoria'}), 400
        
        fecha_inicio = datetime.strptime(data['fecha_inicio'], '%Y-%m-%d').date()
        dias_entre_jornadas = data.get('dias_entre_jornadas', 7)
        hora_inicio = data.get('hora_inicio', '15:00')
        hora_segundo = data.get('hora_segundo_partido', '17:00')
        incluir_vuelta = data.get('incluir_vuelta', True)
        
        # Obtener equipos aprobados
        equipos = Equipo.query.filter_by(estado='aprobado').all()
        
        if len(equipos) < 2:
            return jsonify({
                'error': 'Se necesitan al menos 2 equipos aprobados para generar partidos'
            }), 400
        
        # Generar combinaciones (todos contra todos)
        partidos_creados = []
        jornada = 1
        fecha_actual = fecha_inicio
        
        # IDA
        combinaciones = list(combinations(equipos, 2))
        partidos_por_jornada = len(equipos) // 2
        
        for i in range(0, len(combinaciones), partidos_por_jornada):
            partidos_jornada = combinaciones[i:i+partidos_por_jornada]
            
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
        
        # VUELTA (invertir local y visitante)
        if incluir_vuelta:
            for i in range(0, len(combinaciones), partidos_por_jornada):
                partidos_jornada = combinaciones[i:i+partidos_por_jornada]
                
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
        
        # Marcar como generados
        campeonato.partidos_generados = True
        campeonato.fecha_generacion_partidos = datetime.utcnow()
        
        db.session.commit()
        
        return jsonify({
            'mensaje': 'Partidos generados exitosamente',
            'campeonato': campeonato.nombre,
            'total_equipos': len(equipos),
            'total_jornadas': jornada - 1,
            'total_partidos': len(partidos_creados),
            'partidos': [p.to_dict() for p in partidos_creados]
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500