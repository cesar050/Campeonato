from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app.middlewares.auth_middleware import role_required
from app.extensions import db
from app.models.jugador import Jugador
from app.models.equipo import Equipo
from datetime import datetime

jugador_bp = Blueprint('jugadores', __name__)

@jugador_bp.route('', methods=['POST'])
@jwt_required()
@role_required(['admin', 'lider'])
def crear_jugador():
    """
    Crear jugador usando NOMBRE del equipo en vez de ID
    
    Body:
        {
            "nombre_equipo": "Barcelona FC",
            "nombre": "Lionel",
            "apellido": "Messi",
            ...
        }
    """
    try:
        data = request.get_json()
        
        # Validaciones básicas
        if not data.get('nombre_equipo'):
            return jsonify({'error': 'El nombre del equipo es obligatorio'}), 400
        
        if not data.get('nombre'):
            return jsonify({'error': 'El nombre es obligatorio'}), 400
        
        if not data.get('apellido'):
            return jsonify({'error': 'El apellido es obligatorio'}), 400
        
        if not data.get('documento'):
            return jsonify({'error': 'El documento es obligatorio'}), 400
        
        if not data.get('dorsal'):
            return jsonify({'error': 'El dorsal es obligatorio'}), 400
        
        # Buscar equipo por nombre
        equipo = Equipo.query.filter(
            Equipo.nombre.ilike(f"%{data['nombre_equipo']}%")
        ).first()
        
        if not equipo:
            return jsonify({
                'error': 'Equipo no encontrado',
                'mensaje': f'No existe un equipo con el nombre "{data["nombre_equipo"]}"'
            }), 404
        
        # Verificar que el equipo está aprobado
        if equipo.estado != 'aprobado':
            return jsonify({'error': 'El equipo debe estar aprobado para agregar jugadores'}), 400
        
        # Verificar que no exista un jugador con el mismo documento
        jugador_existente = Jugador.query.filter_by(documento=data['documento']).first()
        if jugador_existente:
            return jsonify({'error': 'Ya existe un jugador con este documento'}), 400
        
        # Verificar que el dorsal no esté ocupado
        dorsal_ocupado = Jugador.query.filter_by(
            id_equipo=equipo.id_equipo,
            dorsal=data['dorsal']
        ).first()
        if dorsal_ocupado:
            return jsonify({'error': f'El dorsal {data["dorsal"]} ya está ocupado en {equipo.nombre}'}), 400
        
        # Crear jugador
        nuevo_jugador = Jugador(
            id_equipo=equipo.id_equipo,
            nombre=data['nombre'],
            apellido=data['apellido'],
            documento=data['documento'],
            dorsal=int(data['dorsal']),
            posicion=data.get('posicion', 'delantero'),
            fecha_nacimiento=datetime.fromisoformat(data['fecha_nacimiento']).date() if data.get('fecha_nacimiento') else None
        )
        
        db.session.add(nuevo_jugador)
        db.session.commit()
        
        return jsonify({
            'mensaje': 'Jugador creado exitosamente',
            'jugador': nuevo_jugador.to_dict(),
            'equipo': equipo.nombre
        }), 201
        
    except ValueError:
        return jsonify({'error': 'Formato de fecha inválido. Use YYYY-MM-DD'}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@jugador_bp.route('', methods=['GET'])
def obtener_jugadores():
    try:
        id_equipo = request.args.get('id_equipo')
        posicion = request.args.get('posicion')
        activo = request.args.get('activo')
        
        query = Jugador.query
        
        if id_equipo:
            query = query.filter_by(id_equipo=int(id_equipo))
        if posicion:
            query = query.filter_by(posicion=posicion)
        if activo is not None:
            query = query.filter_by(activo=activo.lower() == 'true')
        
        jugadores = query.order_by(Jugador.apellido, Jugador.nombre).all()
        
        return jsonify({
            'jugadores': [jugador.to_dict() for jugador in jugadores]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@jugador_bp.route('/<int:id_jugador>', methods=['GET'])
def obtener_jugador_por_id(id_jugador):
    try:
        jugador = Jugador.query.get(id_jugador)
        if not jugador:
            return jsonify({'error': 'Jugador no encontrado'}), 404
        return jsonify({'jugador': jugador.to_dict()}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@jugador_bp.route('/<int:id_jugador>', methods=['PUT'])
@jwt_required()
@role_required(['admin', 'lider'])
def actualizar_jugador(id_jugador):
    try:
        jugador = Jugador.query.get(id_jugador)
        if not jugador:
            return jsonify({'error': 'Jugador no encontrado'}), 404
        
        data = request.get_json()
        
        if 'nombre' in data:
            jugador.nombre = data['nombre']
        
        if 'apellido' in data:
            jugador.apellido = data['apellido']
        
        if 'dorsal' in data:
            # Verificar que el dorsal no esté ocupado por otro jugador del mismo equipo
            dorsal_ocupado = Jugador.query.filter_by(
                id_equipo=jugador.id_equipo,
                dorsal=data['dorsal']
            ).first()
            if dorsal_ocupado and dorsal_ocupado.id_jugador != id_jugador:
                return jsonify({'error': f'El dorsal {data["dorsal"]} ya está ocupado en este equipo'}), 400
            jugador.dorsal = int(data['dorsal'])
        
        if 'posicion' in data:
            posiciones_validas = ['portero', 'defensa', 'mediocampista', 'delantero']
            if data['posicion'] not in posiciones_validas:
                return jsonify({
                    'error': f'Posición no válida. Debe ser una de: {", ".join(posiciones_validas)}'
                }), 400
            jugador.posicion = data['posicion']
        
        if 'fecha_nacimiento' in data:
            jugador.fecha_nacimiento = datetime.fromisoformat(data['fecha_nacimiento']).date()
        
        if 'activo' in data:
            jugador.activo = data['activo']
        
        db.session.commit()
        
        return jsonify({
            'mensaje': 'Jugador actualizado',
            'jugador': jugador.to_dict()
        }), 200
        
    except ValueError:
        return jsonify({'error': 'Formato de fecha inválido. Use YYYY-MM-DD'}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@jugador_bp.route('/<int:id_jugador>/activar', methods=['PATCH'])
@jwt_required()
@role_required(['admin', 'lider'])
def cambiar_estado_jugador(id_jugador):
    try:
        jugador = Jugador.query.get(id_jugador)
        if not jugador:
            return jsonify({'error': 'Jugador no encontrado'}), 404
        
        data = request.get_json()
        
        if 'activo' not in data:
            return jsonify({'error': 'El campo activo es requerido'}), 400
        
        jugador.activo = data['activo']
        db.session.commit()
        
        estado = 'activado' if data['activo'] else 'desactivado'
        
        return jsonify({
            'mensaje': f'Jugador {estado} exitosamente',
            'jugador': jugador.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@jugador_bp.route('/<int:id_jugador>', methods=['DELETE'])
@jwt_required()
@role_required(['admin'])
def eliminar_jugador(id_jugador):
    try:
        jugador = Jugador.query.get(id_jugador)
        if not jugador:
            return jsonify({'error': 'Jugador no encontrado'}), 404
        
        # Verificar si tiene goles o tarjetas registradas
        if jugador.goles.count() > 0 or jugador.tarjetas.count() > 0:
            return jsonify({
                'error': 'No se puede eliminar un jugador con estadísticas registradas. Desactívelo en su lugar.'
            }), 400
        
        db.session.delete(jugador)
        db.session.commit()
        
        return jsonify({'mensaje': 'Jugador eliminado exitosamente'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@jugador_bp.route('/equipo/<int:id_equipo>/posicion/<string:posicion>', methods=['GET'])
def obtener_jugadores_por_posicion(id_equipo, posicion):
    try:
        equipo = Equipo.query.get(id_equipo)
        if not equipo:
            return jsonify({'error': 'Equipo no encontrado'}), 404
        
        posiciones_validas = ['portero', 'defensa', 'mediocampista', 'delantero']
        if posicion not in posiciones_validas:
            return jsonify({
                'error': f'Posición no válida. Debe ser una de: {", ".join(posiciones_validas)}'
            }), 400
        
        jugadores = Jugador.query.filter_by(
            id_equipo=id_equipo,
            posicion=posicion,
            activo=True
        ).all()
        
        return jsonify({
            'equipo': equipo.nombre,
            'posicion': posicion,
            'total_jugadores': len(jugadores),
            'jugadores': [j.to_dict() for j in jugadores]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500