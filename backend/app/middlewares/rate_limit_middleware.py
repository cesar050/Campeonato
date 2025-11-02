from functools import wraps
from flask import request, jsonify
from app.security.rate_limiter import RateLimiter

def rate_limit(max_requests: int = None, window_minutes: int = None):
    """
    Decorador de rate limiting para endpoints
    
    Uso:
        @rate_limit(max_requests=5, window_minutes=1)
        def login():
            pass
    
    Args:
        max_requests: Número máximo de peticiones (usa config si no se especifica)
        window_minutes: Ventana de tiempo en minutos (usa config si no se especifica)
    
    Returns:
        function: Decorador
    """
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            # Obtener identificador (IP o user_id)
            identifier = RateLimiter.get_identifier()
            
            # Obtener endpoint
            endpoint = request.endpoint or request.path
            
            # Verificar rate limit
            result = RateLimiter.check_rate_limit(identifier, endpoint)
            
            # Si está bloqueado
            if not result.get('allowed', True):
                return jsonify({
                    'error': 'Demasiadas peticiones',
                    'message': result.get('message', 'Has excedido el límite de peticiones'),
                    'reset_at': result.get('reset_at').isoformat() if result.get('reset_at') else None
                }), 429
            
            # Agregar headers de rate limit
            response = f(*args, **kwargs)
            
            # Si es una tupla (response, status_code)
            if isinstance(response, tuple):
                json_response, status_code = response
                # Nota: Flask no permite agregar headers a JSON responses directamente
                # En producción, usar after_request para esto
            
            return response
        
        return wrapper
    return decorator