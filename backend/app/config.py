import os
from datetime import timedelta

class Config:
    # Base de datos
    SQLALCHEMY_DATABASE_URI = os.getenv(
        'DATABASE_URL',
        'mysql+pymysql://root:cesar05@localhost/gestion_campeonato'
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # JWT Configuration
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'dev-secret-key-CAMBIAR-EN-PRODUCCION')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=15)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)
    JWT_BLACKLIST_ENABLED = True
    JWT_BLACKLIST_TOKEN_CHECKS = ['access', 'refresh']
    
    # Uploads
    UPLOAD_FOLDER = os.path.join(os.getcwd(), 'uploads')
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16 MB max
    
    # CORS
    CORS_HEADERS = 'Content-Type'

    MAX_LOGIN_ATTEMPTS = 5  # intentos antes de bloquear
    LOCKOUT_DURATION_MINUTES = 10  # tiempo de bloqueo automático
    UNLOCK_CODE_EXPIRES_MINUTES = 15  # validez del código de desbloqueo
    
 
    RATE_LIMIT_ENABLED = True
    RATE_LIMIT_REQUESTS = 100  
    RATE_LIMIT_WINDOW_MINUTES = 15  
    RATE_LIMIT_BAN_DURATION_MINUTES = 30 
    
    # --- Security Logs ---
    SECURITY_LOG_RETENTION_DAYS = 90  
    
    # --- Email Notifications ---
    SEND_LOCKOUT_EMAIL = True  

class DevelopmentConfig(Config):
    DEBUG = True
    TESTING = False

class ProductionConfig(Config):
    DEBUG = False
    TESTING = False
    # En producción, JWT_SECRET_KEY DEBE venir de variable de entorno
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY')

class TestingConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'

config_by_name = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig
}
