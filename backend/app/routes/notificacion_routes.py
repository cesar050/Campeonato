from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.middlewares.auth_middleware import role_required
from app.extensions import db
from app.models.notificacion import Notificacion
from app.models.usuario import Usuario

notificacion_bp = Blueprint('notificaciones', __name__)

@notificacion_bp.route('', methods=['POST'])
@jwt_required()
@role_required(['admin'])
def crear_notificacion():
    try:
        data = request.get_json()
        
        if not data.get('id_usuario'):
            return jsonify({'error': 'El usuario es requerido'}), 400
        
        if not data.get('titulo'):
            return jsonify({'error': 'El título es requerido'}), 400
        
        if not data.get('mensaje'):
            return jsonify({'error': 'El mensaje es requerido'}), 400
        
        usuario = Usuario.query.get(data['id_usuario'])
        if not usuario:
            return jsonify({'error': 'Usuario no encontrado'}), 404
        
        tipos_validos = ['info', 'warning', 'success', 'error']
        tipo = data.get('tipo', 'info')
        if tipo not in tipos_validos:
            return jsonify({'error': f'Tipo no válido. Debe ser: {", ".join(tipos_validos)}'}), 400
        
        nueva_notificacion = Notificacion(
            id_usuario=data['id_usuario'],
            titulo=data['titulo'],
            mensaje=data['mensaje'],
            tipo=tipo
        )
        
        db.session.add(nueva_notificacion)
        db.session.commit()
        
        return jsonify({
            'mensaje': 'Notificación creada exitosamente',
            'notificacion': nueva_notificacion.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@notificacion_bp.route('/mis-notificaciones', methods=['GET'])
@jwt_required()
def obtener_mis_notificaciones():
    try:
        # ✅ CORREGIDO: get_jwt_identity() devuelve un STRING
        current_user_id = int(get_jwt_identity())
        leida = request.args.get('leida')
        
        query = Notificacion.query.filter_by(id_usuario=current_user_id)
        
        if leida is not None:
            query = query.filter_by(leida=leida.lower() == 'true')
        
        notificaciones = query.order_by(Notificacion.fecha_envio.desc()).all()
        
        return jsonify({
            'notificaciones': [n.to_dict() for n in notificaciones]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@notificacion_bp.route('/<int:id_notificacion>', methods=['GET'])
@jwt_required()
def obtener_notificacion_por_id(id_notificacion):
    try:
        notificacion = Notificacion.query.get(id_notificacion)
        
        if not notificacion:
            return jsonify({'error': 'Notificación no encontrada'}), 404
        
        return jsonify({
            'notificacion': notificacion.to_dict()
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@notificacion_bp.route('/<int:id_notificacion>/marcar-leida', methods=['PATCH'])
@jwt_required()
def marcar_como_leida(id_notificacion):
    try:
        # ✅ CORREGIDO
        current_user_id = int(get_jwt_identity())
        notificacion = Notificacion.query.get(id_notificacion)
        
        if not notificacion:
            return jsonify({'error': 'Notificación no encontrada'}), 404
        
        if notificacion.id_usuario != current_user_id:
            return jsonify({'error': 'No tienes permiso para marcar esta notificación'}), 403
        
        notificacion.leida = True
        db.session.commit()
        
        return jsonify({
            'mensaje': 'Notificación marcada como leída',
            'notificacion': notificacion.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@notificacion_bp.route('/<int:id_notificacion>', methods=['DELETE'])
@jwt_required()
@role_required(['admin'])
def eliminar_notificacion(id_notificacion):
    try:
        notificacion = Notificacion.query.get(id_notificacion)
        
        if not notificacion:
            return jsonify({'error': 'Notificación no encontrada'}), 404
        
        db.session.delete(notificacion)
        db.session.commit()
        
        return jsonify({
            'mensaje': 'Notificación eliminada exitosamente'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500