from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app.middlewares.auth_middleware import role_required
from app.extensions import db
from app.models.tarjeta import Tarjeta
from app.models.partido import Partido
from app.models.jugador import Jugador

tarjeta_bp = Blueprint('tarjetas', __name__)

@tarjeta_bp.route('', methods=['POST'])
@jwt_required()
@role_required(['admin'])
def crear_tarjeta():
    try:
        data = request.get_json()
        
        if not data.get('id_partido'):
            return jsonify({'error': 'El partido es requerido'}), 400
        
        if not data.get('id_jugador'):
            return jsonify({'error': 'El jugador es requerido'}), 400
        
        if not data.get('minuto'):
            return jsonify({'error': 'El minuto es requerido'}), 400
        
        if not data.get('tipo'):
            return jsonify({'error': 'El tipo es requerido'}), 400
        
        partido = Partido.query.get(data['id_partido'])
        if not partido:
            return jsonify({'error': 'Partido no encontrado'}), 404
        
        jugador = Jugador.query.get(data['id_jugador'])
        if not jugador:
            return jsonify({'error': 'Jugador no encontrado'}), 404
        
        if jugador.id_equipo not in [partido.id_equipo_local, partido.id_equipo_visitante]:
            return jsonify({'error': 'El jugador no pertenece a ninguno de los equipos del partido'}), 400
        
        minuto = int(data['minuto'])
        if minuto < 1 or minuto > 120:
            return jsonify({'error': 'El minuto debe estar entre 1 y 120'}), 400
        
        tipos_validos = ['amarilla', 'roja']
        if data['tipo'] not in tipos_validos:
            return jsonify({'error': f'Tipo no válido. Debe ser: {", ".join(tipos_validos)}'}), 400
        
        nueva_tarjeta = Tarjeta(
            id_partido=data['id_partido'],
            id_jugador=data['id_jugador'],
            tipo=data['tipo'],
            minuto=minuto,
            motivo=data.get('motivo')
        )
        
        db.session.add(nueva_tarjeta)
        db.session.commit()
        
        return jsonify({
            'mensaje': 'Tarjeta registrada exitosamente',
            'tarjeta': nueva_tarjeta.to_dict()
        }), 201
        
    except ValueError:
        return jsonify({'error': 'El minuto debe ser un número válido'}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@tarjeta_bp.route('', methods=['GET'])
def obtener_tarjetas():
    try:
        id_partido = request.args.get('id_partido')
        id_jugador = request.args.get('id_jugador')
        tipo = request.args.get('tipo')
        
        query = Tarjeta.query
        
        if id_partido:
            query = query.filter_by(id_partido=int(id_partido))
        
        if id_jugador:
            query = query.filter_by(id_jugador=int(id_jugador))
        
        if tipo:
            query = query.filter_by(tipo=tipo)
        
        tarjetas = query.order_by(Tarjeta.minuto.asc()).all()
        
        return jsonify({
            'tarjetas': [t.to_dict() for t in tarjetas]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@tarjeta_bp.route('/<int:id_tarjeta>', methods=['GET'])
def obtener_tarjeta_por_id(id_tarjeta):
    try:
        tarjeta = Tarjeta.query.get(id_tarjeta)
        
        if not tarjeta:
            return jsonify({'error': 'Tarjeta no encontrada'}), 404
        
        return jsonify({
            'tarjeta': tarjeta.to_dict()
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@tarjeta_bp.route('/<int:id_tarjeta>', methods=['DELETE'])
@jwt_required()
@role_required(['admin'])
def eliminar_tarjeta(id_tarjeta):
    try:
        tarjeta = Tarjeta.query.get(id_tarjeta)
        
        if not tarjeta:
            return jsonify({'error': 'Tarjeta no encontrada'}), 404
        
        db.session.delete(tarjeta)
        db.session.commit()
        
        return jsonify({
            'mensaje': 'Tarjeta eliminada exitosamente'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500
