from app.extensions import db
from datetime import datetime, timedelta

class LoginAttempt(db.Model):
    """
    Modelo para rastrear intentos de login
    
    ¿Para qué sirve?
    - Detectar ataques de fuerza bruta (muchos intentos con diferentes contraseñas)
    - Bloquear cuentas tras X intentos fallidos
    - Auditoría: saber desde dónde intentaron acceder
    - Detectar patrones sospechosos
    """
    __tablename__ = 'login_attempts'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # Email que intentó hacer login
    email = db.Column(db.String(100), nullable=False, index=True)
    
    # Desde qué IP
    ip_address = db.Column(db.String(45), nullable=False, index=True)
    
    # Navegador/dispositivo
    user_agent = db.Column(db.Text)
    
    # ¿Fue exitoso?
    success = db.Column(db.Boolean, default=False)
    
    # Cuándo se intentó
    attempted_at = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    
    # Razón de fallo: 'credenciales_invalidas', 'cuenta_bloqueada', 'cuenta_inactiva'
    failure_reason = db.Column(db.String(100))
    
    def __repr__(self):
        return f'<LoginAttempt {self.email} - {"✓" if self.success else "✗"}>'
    
    @staticmethod
    def count_recent_failures(email, minutes=10):
        """
        Cuenta intentos fallidos recientes para un email
        
        Args:
            email: Email a verificar
            minutes: Ventana de tiempo (default 10 minutos)
        
        Returns:
            int: Cantidad de intentos fallidos
        """
        time_threshold = datetime.utcnow() - timedelta(minutes=minutes)
        return LoginAttempt.query.filter(
            LoginAttempt.email == email,
            LoginAttempt.success == False,
            LoginAttempt.attempted_at >= time_threshold
        ).count()
    
    @staticmethod
    def record_attempt(email, ip_address, user_agent, success, failure_reason=None):
        """Registra un intento de login"""
        attempt = LoginAttempt(
            email=email,
            ip_address=ip_address,
            user_agent=user_agent,
            success=success,
            failure_reason=failure_reason
        )
        db.session.add(attempt)
        db.session.commit()
        return attempt
    
    def to_dict(self):
        return {
            'id': self.id,
            'email': self.email,
            'ip_address': self.ip_address,
            'success': self.success,
            'attempted_at': self.attempted_at.isoformat(),
            'failure_reason': self.failure_reason
        }