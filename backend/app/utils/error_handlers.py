from flask import jsonify
from werkzeug.exceptions import HTTPException
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
from jwt.exceptions import InvalidTokenError
from flask_jwt_extended.exceptions import JWTExtendedException

def register_error_handlers(app):
    """
    Registra manejadores globales de errores
    
    OWASP: Manejo seguro de errores sin exponer información sensible
    """
    
    @app.errorhandler(400)
    def bad_request(error):
        """Petición malformada"""
        return jsonify({
            'error': 'Petición incorrecta',
            'message': str(error) if app.debug else 'Los datos enviados no son válidos'
        }), 400
    
    
    @app.errorhandler(401)
    def unauthorized(error):
        """No autenticado"""
        return jsonify({
            'error': 'No autorizado',
            'message': 'Debes iniciar sesión para acceder a este recurso'
        }), 401
    
    
    @app.errorhandler(403)
    def forbidden(error):
        """Sin permisos"""
        return jsonify({
            'error': 'Acceso denegado',
            'message': 'No tienes permisos para realizar esta acción'
        }), 403
    
    
    @app.errorhandler(404)
    def not_found(error):
        """Recurso no encontrado"""
        return jsonify({
            'error': 'No encontrado',
            'message': 'El recurso solicitado no existe'
        }), 404
    
    
    @app.errorhandler(405)
    def method_not_allowed(error):
        """Método HTTP no permitido"""
        return jsonify({
            'error': 'Método no permitido',
            'message': f'El método {error.valid_methods} no está permitido para esta ruta'
        }), 405
    
    
    @app.errorhandler(409)
    def conflict(error):
        """Conflicto (duplicado)"""
        return jsonify({
            'error': 'Conflicto',
            'message': 'Ya existe un recurso con esos datos'
        }), 409
    
    
    @app.errorhandler(413)
    def payload_too_large(error):
        """Archivo muy grande"""
        return jsonify({
            'error': 'Archivo demasiado grande',
            'message': 'El archivo excede el tamaño máximo permitido (16 MB)'
        }), 413
    
    
    @app.errorhandler(415)
    def unsupported_media_type(error):
        """Tipo de contenido no soportado"""
        return jsonify({
            'error': 'Tipo de contenido no soportado',
            'message': 'El servidor no puede procesar este tipo de contenido'
        }), 415
    
    
    @app.errorhandler(422)
    def unprocessable_entity(error):
        """Validación fallida"""
        return jsonify({
            'error': 'Error de validación',
            'message': str(error) if app.debug else 'Los datos no cumplen con los requisitos'
        }), 422
    
    
    @app.errorhandler(429)
    def too_many_requests(error):
        """Rate limit excedido"""
        return jsonify({
            'error': 'Demasiadas peticiones',
            'message': 'Has excedido el límite de peticiones. Intenta nuevamente más tarde.'
        }), 429
    
    
    @app.errorhandler(500)
    def internal_server_error(error):
        """Error interno del servidor"""
        # En producción, NO mostrar detalles del error
        if app.debug:
            return jsonify({
                'error': 'Error interno del servidor',
                'message': str(error),
                'type': type(error).__name__
            }), 500
        else:
            return jsonify({
                'error': 'Error interno del servidor',
                'message': 'Ocurrió un error inesperado. Por favor contacta al administrador.'
            }), 500
    
    
    @app.errorhandler(503)
    def service_unavailable(error):
        """Servicio no disponible"""
        return jsonify({
            'error': 'Servicio no disponible',
            'message': 'El servidor está temporalmente fuera de servicio. Intenta más tarde.'
        }), 503
    
    
    # ============================================
    # ERRORES DE BASE DE DATOS
    # ============================================
    
    @app.errorhandler(IntegrityError)
    def handle_integrity_error(error):
        """Error de integridad de BD (duplicados, FK, etc.)"""
        app.logger.error(f'IntegrityError: {str(error)}')
        
        # Detectar tipo de error
        error_msg = str(error.orig).lower()
        
        if 'duplicate' in error_msg or 'unique' in error_msg:
            message = 'Ya existe un registro con esos datos'
        elif 'foreign key' in error_msg:
            message = 'El registro referenciado no existe'
        else:
            message = 'Error de integridad en la base de datos'
        
        return jsonify({
            'error': 'Error de base de datos',
            'message': message,
            'details': str(error.orig) if app.debug else None
        }), 409
    
    
    @app.errorhandler(SQLAlchemyError)
    def handle_sqlalchemy_error(error):
        """Error genérico de SQLAlchemy"""
        app.logger.error(f'SQLAlchemyError: {str(error)}')
        
        return jsonify({
            'error': 'Error de base de datos',
            'message': 'Ocurrió un error al procesar la operación',
            'details': str(error) if app.debug else None
        }), 500
    
    
    # ============================================
    # ERRORES DE JWT
    # ============================================
    
    @app.errorhandler(JWTExtendedException)
    def handle_jwt_error(error):
        """Errores de JWT (token expirado, inválido, etc.)"""
        app.logger.warning(f'JWT Error: {str(error)}')
        
        return jsonify({
            'error': 'Error de autenticación',
            'message': str(error)
        }), 401
    
    
    @app.errorhandler(InvalidTokenError)
    def handle_invalid_token(error):
        """Token JWT inválido"""
        return jsonify({
            'error': 'Token inválido',
            'message': 'El token de autenticación no es válido'
        }), 401
    
    
    # ============================================
    # ERRORES GENÉRICOS
    # ============================================
    
    @app.errorhandler(HTTPException)
    def handle_http_exception(error):
        """Maneja cualquier HTTPException de Werkzeug"""
        return jsonify({
            'error': error.name,
            'message': error.description
        }), error.code
    
    
    @app.errorhandler(Exception)
    def handle_generic_exception(error):
        """Captura CUALQUIER error no manejado"""
        app.logger.error(f'Unhandled Exception: {str(error)}', exc_info=True)
        
        # En producción, NO exponer detalles
        if app.debug:
            return jsonify({
                'error': 'Error inesperado',
                'message': str(error),
                'type': type(error).__name__
            }), 500
        else:
            return jsonify({
                'error': 'Error inesperado',
                'message': 'Ocurrió un error inesperado. El equipo técnico ha sido notificado.'
            }), 500
    
    
  