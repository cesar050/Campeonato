from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app.middlewares.auth_middleware import role_required
from app.extensions import db
from app.models.alineacion import Alineacion
from app.models.partido import Partido
from app.models.equipo import Equipo
from app.models.jugador import Jugador

alineacion_bp = Blueprint('alineaciones', __name__)

@alineacion_bp.route('', methods=['POST'])
@jwt_required()
@role_required(['admin', 'lider'])
def crear_alineacion():
    try:
        data = request.get_json()
        
        if not data.get('id_partido'):
            return jsonify({'error': 'El partido es requerido'}), 400
        
        if not data.get('id_equipo'):
            return jsonify({'error': 'El equipo es requerido'}), 400
        
        if not data.get('id_jugador'):
            return jsonify({'error': 'El jugador es requerido'}), 400
        
        partido = Partido.query.get(data['id_partido'])
        if not partido:
            return jsonify({'error': 'Partido no encontrado'}), 404
        
        equipo = Equipo.query.get(data['id_equipo'])
        if not equipo:
            return jsonify({'error': 'Equipo no encontrado'}), 404
        
        jugador = Jugador.query.get(data['id_jugador'])
        if not jugador:
            return jsonify({'error': 'Jugador no encontrado'}), 404
        
        if equipo.id_equipo not in [partido.id_equipo_local, partido.id_equipo_visitante]:
            return jsonify({'error': 'El equipo no participa en este partido'}), 400
        
        if jugador.id_equipo != equipo.id_equipo:
            return jsonify({'error': 'El jugador no pertenece a este equipo'}), 400
        
        alineacion_existente = Alineacion.query.filter_by(
            id_partido=data['id_partido'],
            id_jugador=data['id_jugador']
        ).first()
        
        if alineacion_existente:
            return jsonify({'error': 'El jugador ya está en la alineación de este partido'}), 400
        
        nueva_alineacion = Alineacion(
            id_partido=data['id_partido'],
            id_equipo=data['id_equipo'],
            id_jugador=data['id_jugador'],
            titular=data.get('titular', True),
            minuto_entrada=data.get('minuto_entrada', 0),
            minuto_salida=data.get('minuto_salida')
        )
        
        db.session.add(nueva_alineacion)
        db.session.commit()
        
        return jsonify({
            'mensaje': 'Alineación registrada exitosamente',
            'alineacion': nueva_alineacion.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@alineacion_bp.route('', methods=['GET'])
def obtener_alineaciones():
    try:
        id_partido = request.args.get('id_partido')
        id_equipo = request.args.get('id_equipo')
        titular = request.args.get('titular')
        
        query = Alineacion.query
        
        if id_partido:
            query = query.filter_by(id_partido=int(id_partido))
        
        if id_equipo:
            query = query.filter_by(id_equipo=int(id_equipo))
        
        if titular is not None:
            query = query.filter_by(titular=titular.lower() == 'true')
        
        alineaciones = query.all()
        
        return jsonify({
            'alineaciones': [a.to_dict() for a in alineaciones]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@alineacion_bp.route('/<int:id_alineacion>', methods=['GET'])
def obtener_alineacion_por_id(id_alineacion):
    try:
        alineacion = Alineacion.query.get(id_alineacion)
        
        if not alineacion:
            return jsonify({'error': 'Alineación no encontrada'}), 404
        
        return jsonify({
            'alineacion': alineacion.to_dict()
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@alineacion_bp.route('/<int:id_alineacion>', methods=['DELETE'])
@jwt_required()
@role_required(['admin'])
def eliminar_alineacion(id_alineacion):
    try:
        alineacion = Alineacion.query.get(id_alineacion)
        
        if not alineacion:
            return jsonify({'error': 'Alineación no encontrada'}), 404
        
        db.session.delete(alineacion)
        db.session.commit()
        
        return jsonify({
            'mensaje': 'Alineación eliminada exitosamente'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500