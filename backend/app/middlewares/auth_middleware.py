from functools import wraps
from flask import jsonify
from flask_jwt_extended import get_jwt

def role_required(roles):
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            claims = get_jwt()
            
            # El rol viene en los claims del token
            if not claims or claims.get('rol') not in roles:
                return jsonify({'error': 'No tienes permisos'}), 403
            
            return f(*args, **kwargs)
        return wrapper
    return decorator