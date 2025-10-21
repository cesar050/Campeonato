from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.middlewares.auth_middleware import role_required
from app.extensions import db
from app.models.equipo import Equipo
from app.models.usuario import Usuario
from datetime import datetime
from werkzeug.utils import secure_filename
import os

equipo_bp = Blueprint('equipos', __name__)

# Versión simplificada sin subida de archivos (para testing)
@equipo_bp.route('', methods=['POST'])
@jwt_required()
@role_required(['admin', 'lider'])
def crear_equipo():
    try:
        data = request.get_json()
        
        # Validaciones básicas
        if not data.get('nombre'):
            return jsonify({'error': 'El nombre es obligatorio'}), 400
        
        if not data.get('id_lider'):
            return jsonify({'error': 'El id_lider es obligatorio'}), 400
        
        # Verificar si el equipo ya existe
        equipo_existente = Equipo.query.filter_by(nombre=data['nombre']).first()
        if equipo_existente:
            return jsonify({'error': 'Ya existe un equipo con este nombre'}), 400
        
        # Verificar que el líder existe
        lider = Usuario.query.get(data['id_lider'])
        if not lider:
            return jsonify({'error': 'Líder no encontrado'}), 404
        
        nuevo_equipo = Equipo(
            nombre=data['nombre'],
            logo_url=data.get('logo_url'),  # Opcional
            id_lider=int(data['id_lider']),
            estado='pendiente'
        )
        
        db.session.add(nuevo_equipo)
        db.session.commit()
        
        return jsonify({
            'mensaje': 'Equipo creado exitosamente',
            'equipo': nuevo_equipo.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@equipo_bp.route('', methods=['GET'])
def obtener_equipos():
    try:
        estado = request.args.get('estado')
        id_lider = request.args.get('id_lider')
        
        query = Equipo.query
        if estado:
            query = query.filter_by(estado=estado)
        if id_lider:
            query = query.filter_by(id_lider=int(id_lider))
        
        equipos = query.order_by(Equipo.fecha_registro.desc()).all()
        return jsonify({
            'equipos': [equipo.to_dict() for equipo in equipos]
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@equipo_bp.route('/<int:id_equipo>', methods=['GET'])
def obtener_equipo_por_id(id_equipo):
    try:
        equipo = Equipo.query.get(id_equipo)
        if not equipo:
            return jsonify({'error': 'Equipo no encontrado'}), 404
        return jsonify({'equipo': equipo.to_dict()}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@equipo_bp.route('/<int:id_equipo>', methods=['PUT'])
@jwt_required()
@role_required(['admin', 'lider'])
def actualizar_equipo(id_equipo):
    try:
        equipo = Equipo.query.get(id_equipo)
        if not equipo:
            return jsonify({'error': 'Equipo no encontrado'}), 404
        
        data = request.get_json()
        
        if 'nombre' in data:
            # Verificar que no exista otro equipo con ese nombre
            existe = Equipo.query.filter_by(nombre=data['nombre']).first()
            if existe and existe.id_equipo != id_equipo:
                return jsonify({'error': 'Ya existe un equipo con este nombre'}), 400
            equipo.nombre = data['nombre']
        
        if 'logo_url' in data:
            equipo.logo_url = data['logo_url']
        
        db.session.commit()
        return jsonify({
            'mensaje': 'Equipo actualizado',
            'equipo': equipo.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@equipo_bp.route('/<int:id_equipo>/estado', methods=['PATCH'])
@jwt_required()
@role_required(['admin'])
def cambiar_estado_equipo(id_equipo):
    try:
        equipo = Equipo.query.get(id_equipo)
        if not equipo:
            return jsonify({'error': 'Equipo no encontrado'}), 404
        
        data = request.get_json()
        
        if 'estado' not in data:
            return jsonify({'error': 'El campo estado es requerido'}), 400
        
        estados_validos = ['pendiente', 'aprobado', 'rechazado']
        if data['estado'] not in estados_validos:
            return jsonify({
                'error': f'Estado no válido. Debe ser uno de: {", ".join(estados_validos)}'
            }), 400
        
        current_user_id = get_jwt_identity()
        
        equipo.estado = data['estado']
        equipo.aprobado_por = int(current_user_id)
        equipo.fecha_aprobacion = datetime.utcnow()
        
        if 'observaciones' in data:
            equipo.observaciones = data['observaciones']
        
        db.session.commit()
        
        return jsonify({
            'mensaje': f'Equipo {data["estado"]} exitosamente',
            'equipo': equipo.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@equipo_bp.route('/<int:id_equipo>', methods=['DELETE'])
@jwt_required()
@role_required(['admin'])
def eliminar_equipo(id_equipo):
    try:
        equipo = Equipo.query.get(id_equipo)
        if not equipo:
            return jsonify({'error': 'Equipo no encontrado'}), 404
        
        # Verificar si tiene jugadores
        if equipo.jugadores.count() > 0:
            return jsonify({
                'error': 'No se puede eliminar un equipo que tiene jugadores registrados'
            }), 400
        
        db.session.delete(equipo)
        db.session.commit()
        
        return jsonify({'mensaje': 'Equipo eliminado exitosamente'}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@equipo_bp.route('/mis-equipos', methods=['GET'])
@jwt_required()
@role_required(['lider', 'admin'])
def obtener_mis_equipos():
    try:
        current_user_id = get_jwt_identity()
        equipos = Equipo.query.filter_by(id_lider=int(current_user_id)).all()
        return jsonify({
            'equipos': [equipo.to_dict() for equipo in equipos]
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500