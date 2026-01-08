from flask import Flask, jsonify, send_from_directory
from flask_restx import Api
from app.config import config_by_name
from app.extensions import db, migrate, jwt, cors, mail
from app.utils.error_handlers import register_error_handlers
import os
from datetime import timedelta

def create_app(config_name='development'):
    app = Flask(__name__)

    app.config['PROPAGATE_EXCEPTIONS'] = True
    import logging
    logging.basicConfig(level=logging.DEBUG)
    app.config.from_object(config_by_name[config_name])

    api = Api(app, title='Campeonato API', version='1.0', description='API para gestión de campeonatos de fútbol')

    app.config['JWT_SECRET_KEY'] = 'dev-secret-cambiar-en-produccion'
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(minutes=15)
    app.config['JWT_REFRESH_TOKEN_EXPIRES'] = timedelta(days=30)
    app.config['JWT_BLACKLIST_ENABLED'] = True
    app.config['JWT_BLACKLIST_TOKEN_CHECKS'] = ['access', 'refresh']
    
    app.config['MAX_LOGIN_ATTEMPTS'] = 5
    app.config['LOCKOUT_DURATION_MINUTES'] = 10
    app.config['UNLOCK_CODE_EXPIRES_MINUTES'] = 15
    app.config['RATE_LIMIT_ENABLED'] = True
    app.config['RATE_LIMIT_REQUESTS'] = 100
    app.config['RATE_LIMIT_WINDOW_MINUTES'] = 15
    app.config['RATE_LIMIT_BAN_DURATION_MINUTES'] = 30
    app.config['SECURITY_LOG_RETENTION_DAYS'] = 90
    app.config['SEND_LOCKOUT_EMAIL'] = True

    # ============================================
    # RUTA PARA SERVIR ARCHIVOS SUBIDOS
    # ============================================
    @app.route('/uploads/<path:filename>')
    def uploaded_file(filename):
        """Servir archivos subidos (logos, documentos, fotos)"""
        # Construir la ruta absoluta al directorio uploads
        uploads_base = os.path.join(os.path.dirname(app.root_path), 'uploads')
        # El filename puede incluir subdirectorios (ej: logos/archivo.png)
        file_path = os.path.join(uploads_base, filename)
        
        if not os.path.exists(file_path):
            from flask import abort
            app.logger.error(f"Archivo no encontrado: {file_path}")
            abort(404)
        
        # Para send_from_directory, necesitamos el directorio y el nombre del archivo
        directory = os.path.dirname(file_path)
        file_name = os.path.basename(file_path)
        
        return send_from_directory(directory, file_name)
    
    # ============================================
    # CREAR DIRECTORIOS DE UPLOADS
    # ============================================
    uploads_base = os.path.join(os.path.dirname(app.root_path), 'uploads')
    os.makedirs(os.path.join(uploads_base, 'documentos_jugadores'), exist_ok=True)
    os.makedirs(os.path.join(uploads_base, 'fotos_jugadores'), exist_ok=True)
    os.makedirs(os.path.join(uploads_base, 'logos'), exist_ok=True)
    
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)

    cors.init_app(app, resources={
        r"/*": {
            "origins": ["http://localhost:4200", "http://localhost:3000"],
            "methods": ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"],
            "supports_credentials": True,
            "max_age": 3600
        }
    })
    
    app.config['MAIL_SERVER'] = os.getenv('MAIL_SERVER', 'smtp.gmail.com')
    app.config['MAIL_PORT'] = int(os.getenv('MAIL_PORT', 587))
    app.config['MAIL_USE_TLS'] = os.getenv('MAIL_USE_TLS', 'True') == 'True'
    app.config['MAIL_USERNAME'] = os.getenv('MAIL_USERNAME')
    app.config['MAIL_PASSWORD'] = os.getenv('MAIL_PASSWORD')
    app.config['MAIL_DEFAULT_SENDER'] = os.getenv('MAIL_DEFAULT_SENDER')
    mail.init_app(app)
    
    register_error_handlers(app)

    @jwt.token_in_blocklist_loader
    def check_if_token_revoked(jwt_header, jwt_payload):
        from app.security.token_manager import TokenManager
        jti = jwt_payload['jti']
        return TokenManager.is_token_revoked(jti)
    
    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        return jsonify({
            'error': 'Token expirado',
            'message': 'El token ha expirado. Usa el refresh token para obtener uno nuevo.',
            'code': 'TOKEN_EXPIRED'
        }), 401
    
    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        return jsonify({
            'error': 'Token inválido',
            'message': 'El token proporcionado no es válido.',
            'code': 'TOKEN_INVALID'
        }), 401
    
    @jwt.unauthorized_loader
    def missing_token_callback(error):
        return jsonify({
            'error': 'Token requerido',
            'message': 'Se requiere autenticación para acceder a este recurso.',
            'code': 'TOKEN_MISSING'
        }), 401
    
    @jwt.revoked_token_loader
    def revoked_token_callback(jwt_header, jwt_payload):
        return jsonify({
            'error': 'Token revocado',
            'message': 'El token ha sido revocado. Inicia sesión nuevamente.',
            'code': 'TOKEN_REVOKED'
        }), 401
    
    # Importar modelos y crear tablas
    with app.app_context():
        from app.models.usuario import Usuario
        from app.models.equipo import Equipo
        from app.models.jugador import Jugador
        from app.models.campeonato import Campeonato
        from app.models.campeonato_equipo import CampeonatoEquipo
        from app.models.partido import Partido
        from app.models.gol import Gol
        from app.models.tarjeta import Tarjeta
        from app.models.notificacion import Notificacion
        from app.models.solicitud_equipo import SolicitudEquipo
        from app.models.historial_estado import HistorialEstado
        from app.models.token_blacklist import TokenBlacklist
        from app.models.refresh_token import RefreshToken
        from app.models.login_attempt import LoginAttempt
        from app.models.account_lockout import AccountLockout
        from app.models.security_log import SecurityLog
        
        db.create_all()
    
    # Importar namespaces
    from app.routes.auth_routes import auth_ns
    from app.routes.equipo_routes import equipo_ns
    from app.routes.jugador_routes import jugador_ns
    from app.routes.campeonato_routes import campeonato_ns
    from app.routes.campeonato_equipo_routes import inscripcion_ns
    from app.routes.partido_routes import partidos_ns
    from app.routes.gol_routes import gol_ns
    from app.routes.tarjeta_routes import tarjeta_ns
    from app.routes.solicitud_equipo_routes import solicitud_ns
    from app.routes.historial_estado_routes import historial_ns
    from app.routes.notificacion_routes import notificacion_ns
    from app.routes.estadisticas_routes import estadisticas_ns
    from app.routes.superadmin_routes import superadmin_ns
    from app.routes.lider_routes import lider_ns
    from app.routes.upload_routes import upload_ns
    from app.routes.alineaciones_proxy_routes import alineaciones_proxy_bp
    from app.routes.eventos_routes import eventos_bp

    # Registrar namespaces
    api.add_namespace(auth_ns, path='/auth')
    api.add_namespace(equipo_ns, path='/equipos')
    api.add_namespace(jugador_ns, path='/jugadores')
    api.add_namespace(campeonato_ns, path='/campeonatos')
    api.add_namespace(inscripcion_ns, path='/inscripciones')
    api.add_namespace(partidos_ns, path='/partidos')
    api.add_namespace(gol_ns, path='/gol')
    api.add_namespace(tarjeta_ns, path='/tarjetas')
    api.add_namespace(solicitud_ns, path='/solicitudes')
    api.add_namespace(historial_ns, path='/historial')
    api.add_namespace(notificacion_ns, path='/notificaciones')
    api.add_namespace(estadisticas_ns, path='/estadisticas')
    api.add_namespace(superadmin_ns, path='/superadmin')
    api.add_namespace(lider_ns, path='/lider')
    api.add_namespace(upload_ns, path='/upload')
    app.register_blueprint(alineaciones_proxy_bp)
    app.register_blueprint(eventos_bp)

    @app.route('/health')
    def health_check():
        return jsonify({
            'status': 'ok',
            'message': 'API funcionando correctamente',
            'version': '1.0.0'
        }), 200
    
    return app