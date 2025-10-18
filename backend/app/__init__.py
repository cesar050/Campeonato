from flask import Flask, jsonify
from app.config import config_by_name
from app.extensions import db, migrate, jwt, cors
import os

def create_app(config_name='development'):
    app = Flask(__name__)
    app.config.from_object(config_by_name[config_name])
    
    # Crear carpetas de uploads
    os.makedirs(os.path.join(app.config['UPLOAD_FOLDER'], 'documentos'), exist_ok=True)
    os.makedirs(os.path.join(app.config['UPLOAD_FOLDER'], 'logos'), exist_ok=True)
    
    # Inicializar extensiones
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
    
    # Crear tablas automáticamente
    with app.app_context():
        db.create_all()
    
    # Registrar blueprints
    from app.routes.auth_routes import auth_bp
    from app.routes.equipo_routes import equipo_bp
    from app.routes.jugador_routes import jugador_bp
    from app.routes.campeonato_routes import campeonato_bp
    from app.routes.partido_routes import partidos_bp
    from app.routes.gol_routes import gol_bp
    
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(equipo_bp, url_prefix='/api/equipos')
    app.register_blueprint(jugador_bp, url_prefix='/api/jugadores')
    app.register_blueprint(campeonato_bp, url_prefix='/api/campeonato')
    app.register_blueprint(partidos_bp, url_prefix='/api/partido')
    app.register_blueprint(gol_bp, url_prefix='/api/gol')
    

    
    # Ruta de salud
    @app.route('/health')
    def health_check():
        return jsonify({'status': 'ok', 'message': 'API funcionando correctamente'}), 200
    
    # Manejador de errores
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({'error': 'Ruta no encontrada'}), 404
    
    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({'error': 'Error interno del servidor'}), 500
    
    return app