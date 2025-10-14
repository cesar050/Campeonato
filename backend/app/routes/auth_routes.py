from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from app.extensions import db
from app.models.usuario import Usuario  # ← Asegúrate que diga "usuario"
from app.utils.validators import validar_email

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        
        if not data.get('nombre') or not data.get('email') or not data.get('contrasena'):
            return jsonify({'error': 'Nombre, email y contraseña son requeridos'}), 400
        
        if not validar_email(data['email']):
            return jsonify({'error': 'Email no válido'}), 400
        
        if Usuario.query.filter_by(email=data['email']).first():
            return jsonify({'error': 'El email ya está registrado'}), 400
        
        nuevo_usuario = Usuario(
            nombre=data['nombre'],
            email=data['email'],
            rol=data.get('rol', 'lider')
        )
        nuevo_usuario.set_password(data['contrasena'])
        
        db.session.add(nuevo_usuario)
        db.session.commit()
        
        return jsonify({
            'mensaje': 'Usuario registrado exitosamente',
            'usuario': nuevo_usuario.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        
        if not data.get('email') or not data.get('contrasena'):
            return jsonify({'error': 'Email y contraseña requeridos'}), 400
        
        usuario = Usuario.query.filter_by(email=data['email']).first()
        
        if not usuario or not usuario.check_password(data['contrasena']):
            return jsonify({'error': 'Credenciales inválidas'}), 401
        
        identity = {
            'id_usuario': usuario.id_usuario,
            'email': usuario.email,
            'rol': usuario.rol
        }
        access_token = create_access_token(identity=identity)
        
        return jsonify({
            'mensaje': 'Login exitoso',
            'access_token': access_token,
            'usuario': usuario.to_dict()
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@auth_bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    current_user = get_jwt_identity()
    usuario = Usuario.query.get(current_user['id_usuario'])
    if not usuario:
        return jsonify({'error': 'Usuario no encontrado'}), 404
    return jsonify({'usuario': usuario.to_dict()}), 200

