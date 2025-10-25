from app.extensions import db
from datetime import datetime
import json

class SecurityLog(db.Model):
    """
    Modelo para logs de auditoría de seguridad
    
    ¿Para qué sirve?
    - Cumplimiento normativo (GDPR, SOC2, etc requieren logs)
    - Investigación de incidentes
    - Detectar patrones de ataque
    - Monitoreo en tiempo real
    
    ¿Qué eventos registramos?
    - Logins exitosos/fallidos
    - Cambios de contraseña
    - Bloqueos/desbloqueos de cuenta
    - Actividad sospechosa
    - Revocación de tokens
    """
    __tablename__ = 'security_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # Tipo de evento
    event_type = db.Column(
        db.Enum(
            'login_success',
            'login_failed',
            'logout',
            'password_changed',
            'account_locked',
            'account_unlocked',
            'token_revoked',
            'suspicious_activity',
            name='security_event_type'
        ),
        nullable=False,
        index=True
    )
    
    # Usuario relacionado (puede ser NULL si el login falló antes de identificar)
    user_id = db.Column(db.Integer, db.ForeignKey('usuarios.id_usuario'), index=True)
    
    # Email (para casos donde user_id es NULL)
    email = db.Column(db.String(100))
    
    # Desde dónde se originó el evento
    ip_address = db.Column(db.String(45))
    user_agent = db.Column(db.Text)
    
    # Detalles adicionales en formato JSON
    # Ejemplo: {"reason": "credenciales_invalidas", "attempts": 3}
    details = db.Column(db.JSON)
    
    # Timestamp
    created_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    
    # Relación con usuario
    usuario = db.relationship('Usuario', backref='security_logs')
    
    def __repr__(self):
        return f'<SecurityLog {self.event_type} - {self.email}>'
    
    @staticmethod
    def log_event(event_type, user_id=None, email=None, ip_address=None, 
                  user_agent=None, details=None):
        """
        Registra un evento de seguridad
        
        Args:
            event_type: Tipo de evento (login_success, etc)
            user_id: ID del usuario (opcional)
            email: Email del usuario (opcional)
            ip_address: IP desde donde ocurrió
            user_agent: Navegador/dispositivo
            details: Dict con info adicional
        
        Example:
            SecurityLog.log_event(
                event_type='login_failed',
                email='juan@example.com',
                ip_address='192.168.1.100',
                details={'reason': 'credenciales_invalidas'}
            )
        """
        log = SecurityLog(
            event_type=event_type,
            user_id=user_id,
            email=email,
            ip_address=ip_address,
            user_agent=user_agent,
            details=details
        )
        
        db.session.add(log)
        
        try:
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            print(f"Error logging security event: {e}")
    
    @staticmethod
    def get_user_history(user_id, limit=50):
        """Obtiene el historial de eventos de un usuario"""
        return SecurityLog.query.filter_by(user_id=user_id)\
            .order_by(SecurityLog.created_at.desc())\
            .limit(limit).all()
    
    @staticmethod
    def get_failed_logins(minutes=60, limit=100):
        """Obtiene intentos fallidos recientes"""
        from datetime import timedelta
        time_threshold = datetime.utcnow() - timedelta(minutes=minutes)
        
        return SecurityLog.query.filter(
            SecurityLog.event_type == 'login_failed',
            SecurityLog.created_at >= time_threshold
        ).order_by(SecurityLog.created_at.desc()).limit(limit).all()
    
    def to_dict(self):
        return {
            'id': self.id,
            'event_type': self.event_type,
            'user_id': self.user_id,
            'email': self.email,
            'ip_address': self.ip_address,
            'details': self.details,
            'created_at': self.created_at.isoformat()
        }