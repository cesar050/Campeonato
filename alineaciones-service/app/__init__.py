from flask import Flask
from flask_restx import Api
from app.extensions import db, jwt, cors
from app.config import Config

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Initialize Flask-RESTx API
    api = Api(app, title='Alineaciones Service API', version='1.0', description='API para gestión de alineaciones de partidos')

    # Inicializar extensiones
    db.init_app(app)
    jwt.init_app(app)
    cors.init_app(app)

    # Registrar namespaces
    from app.routes.alineacion_routes import alineacion_ns
    api.add_namespace(alineacion_ns, path='/alineaciones')

    return app