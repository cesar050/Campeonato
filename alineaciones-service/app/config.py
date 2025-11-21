import os
class Config:
    # Base de datos PROPIA del microservicio
    #SQLALCHEMY_DATABASE_URI = 'mysql+pymysql://cesar05@localhost/alineaciones_db'
    SQLALCHEMY_DATABASE_URI = 'mysql+pymysql://root:cesar05@localhost/alineaciones_db'
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # JWT (misma secret key para validar tokens)
    #JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'dev-secret-cambiar-en-produccion')
    JWT_SECRET_KEY = 'dev-secret-cambiar-en-produccion'
    
    # URL del backend principal
    BACKEND_API_URL = 'http://localhost:5000/api'