from app.extensions import db
from datetime import datetime

class TokenBlacklist(db.Model):
    """
    Modelo para tokens revocados (blacklist)
    
    ¿Por qué necesitamos esto?
    - Cuando un usuario hace logout, su token sigue siendo válido hasta que expire
    - Con blacklist, podemos invalidar tokens inmediatamente
    - También sirve para revocar tokens cuando se cambia la contraseña
    """
    __tablename__ = 'token_blacklist'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # jti = JWT ID (identificador único del token)
    jti = db.Column(db.String(255), unique=True, nullable=False, index=True)
    
    # Tipo de token: 'access' o 'refresh'
    token_type = db.Column(db.String(20), nullable=False)
    
    # ID del usuario dueño del token
    user_id = db.Column(db.Integer, db.ForeignKey('usuarios.id_usuario'), nullable=False)
    
    # Cuándo se revocó
    revoked_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Cuándo expira el token original
    expires_at = db.Column(db.DateTime, nullable=False)
    
    # Razón de revocación: 'logout', 'password_change', 'suspicious_activity'
    reason = db.Column(db.String(100))
    
    def __repr__(self):
        return f'<TokenBlacklist {self.jti}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'jti': self.jti,
            'token_type': self.token_type,
            'user_id': self.user_id,
            'revoked_at': self.revoked_at.isoformat() if self.revoked_at else None,
            'expires_at': self.expires_at.isoformat() if self.expires_at else None,
            'reason': self.reason
        }