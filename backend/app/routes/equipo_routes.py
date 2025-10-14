from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.middlewares.auth_middleware import role_required
from app.extensions import db
from app.models.equipo import Equipo
from app.models.usuario import Usuario
from app.utils.validators import validar_equipo
from datetime import datetime
from werkzeug.utils import secure_filename
import os

equipo_bp = Blueprint('equipos', __name__)

@equipo_bp.route('', methods=['POST'])
@jwt_required()
@role_required(['admin', 'lider'])
def crear_equipo():
    try:
        data = request.form.to_dict()
        archivo_logo = request.files.get('logo')
        
        errores = validar_equipo(data)
        if errores:
            return jsonify({'errores': errores}), 400
        
        lider = Usuario.query.get(data['id_lider'])
        if not lider:
            return jsonify({'error': 'Líder no encontrado'}), 404
        
        logo_url = None
        if archivo_logo:
            filename = secure_filename(archivo_logo.filename)
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            nombre_archivo = f"{timestamp}_{filename}"
            from flask import current_app
            ruta = os.path.join(current_app.config['UPLOAD_FOLDER'], 'logos', nombre_archivo)
            archivo_logo.save(ruta)
            logo_url = f"logos/{nombre_archivo}"
        
        nuevo_equipo = Equipo(
            nombre=data['nombre'],
            logo_url=logo_url,
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
        return jsonify({'equipo': equipo.to_dict(include_jugadores=True)}), 200
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
        
        data = request.form.to_dict()
        if 'nombre' in data:
            equipo.nombre = data['nombre']
        
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
        
        current_user = get_jwt_identity()
        equipo.estado = data['estado']
        equipo.aprobado_por = current_user['id_usuario']
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
        
        db.session.delete(equipo)
        db.session.commit()
        return jsonify({'mensaje': 'Equipo eliminado'}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@equipo_bp.route('/mis-equipos', methods=['GET'])
@jwt_required()
@role_required(['lider', 'admin'])
def obtener_mis_equipos():
    current_user = get_jwt_identity()
    equipos = Equipo.query.filter_by(id_lider=current_user['id_usuario']).all()
    return jsonify({'equipos': [equipo.to_dict() for equipo in equipos]}), 200
