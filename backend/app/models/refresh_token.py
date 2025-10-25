from app.extensions import db
from datetime import datetime, timedelta
import secrets

class RefreshToken(db.Model):
    """
    Modelo para Refresh Tokens
    
    ¿Qué es un refresh token?
    - Access token expira rápido (15-30 min)
    - Refresh token expira lento (7-30 días)
    - Cuando el access token expira, usas el refresh token para obtener uno nuevo
    - Así el usuario no tiene que hacer login cada 15 minutos
    
    ¿Por qué es más seguro?
    - Access token viaja en cada petición (más exposición)
    - Refresh token solo se usa una vez para renovar
    - Si roban el access token, expira rápido
    - Si roban el refresh token, podemos revocarlo
    """
    __tablename__ = 'refresh_tokens'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('usuarios.id_usuario'), nullable=False)
    
    # Token largo y seguro (generado con secrets)
    token = db.Column(db.String(500), unique=True, nullable=False, index=True)
    
    # Cuándo expira (ej: 30 días desde creación)
    expires_at = db.Column(db.DateTime, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Info del dispositivo (para seguridad)
    ip_address = db.Column(db.String(45))
    user_agent = db.Column(db.Text)
    
    # ¿Fue revocado? (logout, cambio password, etc)
    is_revoked = db.Column(db.Boolean, default=False)
    
    # Relación con usuario
    usuario = db.relationship('Usuario', backref='refresh_tokens')
    
    def __repr__(self):
        return f'<RefreshToken user_id={self.user_id}>'
    
    @staticmethod
    def generate_token():
        """Genera un token seguro de 64 caracteres"""
        return secrets.token_urlsafe(64)
    
    @staticmethod
    def create_refresh_token(user_id, ip_address=None, user_agent=None, days=30):
        """
        Crea un nuevo refresh token para el usuario
        
        Args:
            user_id: ID del usuario
            ip_address: IP desde donde se creó
            user_agent: Navegador/dispositivo
            days: Días de validez (default 30)
        """
        token = RefreshToken(
            user_id=user_id,
            token=RefreshToken.generate_token(),
            expires_at=datetime.utcnow() + timedelta(days=days),
            ip_address=ip_address,
            user_agent=user_agent
        )
        return token
    
    def is_expired(self):
        """Verifica si el token ya expiró"""
        return datetime.utcnow() > self.expires_at
    
    def is_valid(self):
        """Verifica si el token es válido (no revocado y no expirado)"""
        return not self.is_revoked and not self.is_expired()
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'expires_at': self.expires_at.isoformat(),
            'created_at': self.created_at.isoformat(),
            'is_revoked': self.is_revoked,
            'is_expired': self.is_expired()
        }
    