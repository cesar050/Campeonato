from functools import wraps
from flask import jsonify
from flask_jwt_extended import get_jwt_identity

def role_required(roles):
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            current_user = get_jwt_identity()
            if not current_user or current_user.get('rol') not in roles:
                return jsonify({'error': 'No tienes permisos'}), 403
            return f(*args, **kwargs)
        return wrapper
    return decorator