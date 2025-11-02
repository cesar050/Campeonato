from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.middlewares.auth_middleware import role_required
from app.extensions import db
from app.models.solicitud_equipo import SolicitudEquipo
from app.models.equipo import Equipo
from app.models.usuario import Usuario
from datetime import datetime

solicitud_bp = Blueprint('solicitudes', __name__)

@solicitud_bp.route('', methods=['POST'])
@jwt_required()
@role_required(['lider'])
def crear_solicitud():
    try:
        data = request.get_json()
        # ✅ CORREGIDO
        current_user_id = int(get_jwt_identity())
        
        if not data.get('id_equipo'):
            return jsonify({'error': 'El equipo es requerido'}), 400
        
        equipo = Equipo.query.get(data['id_equipo'])
        if not equipo:
            return jsonify({'error': 'Equipo no encontrado'}), 404
        
        if equipo.id_lider != current_user_id:
            return jsonify({'error': 'Solo el líder del equipo puede crear solicitudes'}), 403
        
        nueva_solicitud = SolicitudEquipo(
            id_equipo=data['id_equipo'],
            id_lider=current_user_id,
            observaciones=data.get('observaciones')
        )
        
        db.session.add(nueva_solicitud)
        db.session.commit()
        
        return jsonify({
            'mensaje': 'Solicitud creada exitosamente',
            'solicitud': nueva_solicitud.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@solicitud_bp.route('', methods=['GET'])
@jwt_required()
def obtener_solicitudes():
    try:
        estado = request.args.get('estado')
        
        query = SolicitudEquipo.query
        
        if estado:
            query = query.filter_by(estado=estado)
        
        solicitudes = query.order_by(SolicitudEquipo.fecha_solicitud.desc()).all()
        
        return jsonify({
            'solicitudes': [s.to_dict() for s in solicitudes]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@solicitud_bp.route('/<int:id_solicitud>', methods=['GET'])
@jwt_required()
def obtener_solicitud_por_id(id_solicitud):
    try:
        solicitud = SolicitudEquipo.query.get(id_solicitud)
        
        if not solicitud:
            return jsonify({'error': 'Solicitud no encontrada'}), 404
        
        return jsonify({
            'solicitud': solicitud.to_dict()
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@solicitud_bp.route('/<int:id_solicitud>/estado', methods=['PATCH'])
@jwt_required()
@role_required(['admin'])
def cambiar_estado_solicitud(id_solicitud):
    try:
        solicitud = SolicitudEquipo.query.get(id_solicitud)
        
        if not solicitud:
            return jsonify({'error': 'Solicitud no encontrada'}), 404
        
        data = request.get_json()
        # ✅ CORREGIDO
        current_user_id = int(get_jwt_identity())
        
        if 'estado' not in data:
            return jsonify({'error': 'El estado es requerido'}), 400
        
        estados_validos = ['pendiente', 'aprobada', 'rechazada']
        if data['estado'] not in estados_validos:
            return jsonify({'error': f'Estado no válido. Debe ser: {", ".join(estados_validos)}'}), 400
        
        solicitud.estado = data['estado']
        solicitud.revisado_por = current_user_id
        solicitud.fecha_revision = datetime.utcnow()
        
        if 'observaciones' in data:
            solicitud.observaciones = data['observaciones']
        
        db.session.commit()
        
        return jsonify({
            'mensaje': f'Solicitud {data["estado"]}',
            'solicitud': solicitud.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@solicitud_bp.route('/<int:id_solicitud>', methods=['DELETE'])
@jwt_required()
@role_required(['admin'])
def eliminar_solicitud(id_solicitud):
    try:
        solicitud = SolicitudEquipo.query.get(id_solicitud)
        
        if not solicitud:
            return jsonify({'error': 'Solicitud no encontrada'}), 404
        
        db.session.delete(solicitud)
        db.session.commit()
        
        return jsonify({
            'mensaje': 'Solicitud eliminada exitosamente'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500