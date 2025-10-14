from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from app.middlewares.auth_middleware import role_required
from app.extensions import db
from app.models.jugador import Jugador
from app.models.equipo import Equipo
from app.utils.validators import validar_jugador
from datetime import datetime

jugador_bp = Blueprint('jugadores', __name__)

@jugador_bp.route('', methods=['POST'])
@jwt_required()
@role_required(['admin', 'lider'])
def crear_jugador():
    try:
        data = request.form.to_dict()
        
        errores = validar_jugador(data)
        if errores:
            return jsonify({'errores': errores}), 400
        
        equipo = Equipo.query.get(data['id_equipo'])
        if not equipo:
            return jsonify({'error': 'Equipo no encontrado'}), 404
        
        nuevo_jugador = Jugador(
            id_equipo=int(data['id_equipo']),
            nombre=data['nombre'],
            apellido=data['apellido'],
            documento=data['documento'],
            dorsal=int(data['dorsal']),
            posicion=data.get('posicion', 'delantero')
        )
        
        db.session.add(nuevo_jugador)
        db.session.commit()
        
        return jsonify({
            'mensaje': 'Jugador creado exitosamente',
            'jugador': nuevo_jugador.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@jugador_bp.route('', methods=['GET'])
def obtener_jugadores():
    try:
        id_equipo = request.args.get('id_equipo')
        
        query = Jugador.query
        if id_equipo:
            query = query.filter_by(id_equipo=int(id_equipo))
        
        jugadores = query.all()
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
        
        data = request.form.to_dict()
        if 'nombre' in data:
            jugador.nombre = data['nombre']
        if 'apellido' in data:
            jugador.apellido = data['apellido']
        if 'dorsal' in data:
            jugador.dorsal = int(data['dorsal'])
        if 'posicion' in data:
            jugador.posicion = data['posicion']
        
        db.session.commit()
        return jsonify({
            'mensaje': 'Jugador actualizado',
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
        
        db.session.delete(jugador)
        db.session.commit()
        return jsonify({'mensaje': 'Jugador eliminado'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500