from app.extensions import db
from datetime import datetime

class RateLimit(db.Model):
    """
    Modelo para control de tasa de peticiones
    
    Tabla: rate_limits
    """
    __tablename__ = 'rate_limits'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    identifier = db.Column(db.String(100), nullable=False, index=True)
    endpoint = db.Column(db.String(255), nullable=False)
    requests_count = db.Column(db.Integer, default=1)
    window_start = db.Column(db.DateTime, default=datetime.utcnow)
    window_end = db.Column(db.DateTime, nullable=False, index=True)
    blocked_until = db.Column(db.DateTime, nullable=True)
    
    # Índice único para evitar duplicados en la misma ventana
    __table_args__ = (
        db.UniqueConstraint('identifier', 'endpoint', 'window_start', name='unique_rate_limit'),
        db.Index('idx_identifier', 'identifier'),
        db.Index('idx_window_end', 'window_end'),
    )
    
    def __repr__(self):
        return f'<RateLimit {self.identifier} - {self.endpoint} ({self.requests_count})>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'identifier': self.identifier,
            'endpoint': self.endpoint,
            'requests_count': self.requests_count,
            'window_start': self.window_start.isoformat() if self.window_start else None,
            'window_end': self.window_end.isoformat() if self.window_end else None,
            'blocked_until': self.blocked_until.isoformat() if self.blocked_until else None
        }