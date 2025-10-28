from flask import Flask, jsonify
from app.config import config_by_name
from app.extensions import db, migrate, jwt, cors, mail
import os
from datetime import timedelta

def create_app(config_name='development'):
    app = Flask(__name__)
    app.config.from_object(config_by_name[config_name])
    
    # ============================================
    # 🔐 CONFIGURACIÓN JWT (NUEVO)
    # ============================================
    
    # Secret key para firmar los tokens
    app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'dev-secret-cambiar-en-produccion')
    
    # Tiempo de expiración de tokens
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(minutes=15)
    app.config['JWT_REFRESH_TOKEN_EXPIRES'] = timedelta(days=30)
    
    # Configuración de blacklist
    app.config['JWT_BLACKLIST_ENABLED'] = True
    app.config['JWT_BLACKLIST_TOKEN_CHECKS'] = ['access', 'refresh']
    
    # ============================================
    # 📁 CREAR CARPETAS DE UPLOADS
    # ============================================
    
    os.makedirs(os.path.join(app.config['UPLOAD_FOLDER'], 'documentos'), exist_ok=True)
    os.makedirs(os.path.join(app.config['UPLOAD_FOLDER'], 'logos'), exist_ok=True)
    
    # ============================================
    # 🔌 INICIALIZAR EXTENSIONES
    # ============================================
    
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    cors.init_app(app, resources={
        r"/api/*": {
            "origins": "*",
            "methods": ["GET", "POST", "PUT", "PATCH", "DELETE"],
            "allow_headers": ["Content-Type", "Authorization"]
        }
    })
    # Configuración de Flask-Mail
    app.config['MAIL_SERVER'] = os.getenv('MAIL_SERVER', 'smtp.gmail.com')
    app.config['MAIL_PORT'] = int(os.getenv('MAIL_PORT', 587))
    app.config['MAIL_USE_TLS'] = os.getenv('MAIL_USE_TLS', 'True') == 'True'
    app.config['MAIL_USERNAME'] = os.getenv('MAIL_USERNAME')
    app.config['MAIL_PASSWORD'] = os.getenv('MAIL_PASSWORD')
    app.config['MAIL_DEFAULT_SENDER'] = os.getenv('MAIL_DEFAULT_SENDER')

    mail.init_app(app)
    
    # ============================================
    # 🔐 CALLBACKS DE JWT (NUEVO - MUY IMPORTANTE)
    # ============================================
    
    @jwt.token_in_blocklist_loader
    def check_if_token_revoked(jwt_header, jwt_payload):
        """Verifica si un token está en la blacklist"""
        from app.security.token_manager import TokenManager
        jti = jwt_payload['jti']
        return TokenManager.is_token_revoked(jti)
    
    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        """Callback cuando el token expiró"""
        return jsonify({
            'error': 'Token expirado',
            'message': 'El token ha expirado. Usa el refresh token.'
        }), 401
    
    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        """Callback cuando el token es inválido"""
        return jsonify({
            'error': 'Token inválido',
            'message': 'El token proporcionado no es válido.'
        }), 401
    
    @jwt.unauthorized_loader
    def missing_token_callback(error):
        """Callback cuando falta el token"""
        return jsonify({
            'error': 'Token requerido',
            'message': 'Se requiere autenticación.'
        }), 401
    
    @jwt.revoked_token_loader
    def revoked_token_callback(jwt_header, jwt_payload):
        """Callback cuando el token fue revocado"""
        return jsonify({
            'error': 'Token revocado',
            'message': 'El token ha sido revocado. Inicia sesión nuevamente.'
        }), 401
    
    # ============================================
    # 📊 CREAR TABLAS AUTOMÁTICAMENTE
    # ============================================
    
    with app.app_context():
        db.create_all()
    
    # ============================================
    # 🗺️ REGISTRAR BLUEPRINTS
    # ============================================
    
    from app.routes.auth_routes import auth_bp
    from app.routes.equipo_routes import equipo_bp
    from app.routes.jugador_routes import jugador_bp
    from app.routes.campeonato_routes import campeonato_bp
    from app.routes.partido_routes import partidos_bp
    from app.routes.gol_routes import gol_bp
    from app.routes.tarjeta_routes import tarjeta_bp
    from app.routes.alineacion_routes import alineacion_bp
    from app.routes.solicitud_equipo_routes import solicitud_bp
    from app.routes.notificacion_routes import notificacion_bp
    
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(equipo_bp, url_prefix='/api/equipos')
    app.register_blueprint(jugador_bp, url_prefix='/api/jugadores')
    app.register_blueprint(campeonato_bp, url_prefix='/api/campeonato')  
    app.register_blueprint(partidos_bp, url_prefix='/api/partido')        
    app.register_blueprint(gol_bp, url_prefix='/api/gol')               
    app.register_blueprint(tarjeta_bp, url_prefix='/api/tarjetas')
    app.register_blueprint(alineacion_bp, url_prefix='/api/alineaciones')
    app.register_blueprint(solicitud_bp, url_prefix='/api/solicitudes')
    app.register_blueprint(notificacion_bp, url_prefix='/api/notificaciones')
    
    @app.route('/health')
    def health_check():
        return jsonify({
            'status': 'ok',
            'message': 'API funcionando correctamente',
            'jwt_enabled': True
        }), 200
    
    
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({'error': 'Ruta no encontrada'}), 404
    
    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({'error': 'Error interno del servidor'}), 500
    
    return app