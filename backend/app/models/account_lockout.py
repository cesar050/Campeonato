from app.extensions import db
from datetime import datetime, timedelta
import random
import string

class AccountLockout(db.Model):
    """
    Modelo para bloqueos temporales de cuenta
    
    ¿Cómo funciona el sistema de bloqueo?
    1. Usuario falla login 5 veces
    2. Se crea un registro aquí con locked_until = ahora + 10 minutos
    3. Se genera un código de 6 dígitos
    4. Se envía email con el código
    5. Usuario puede:
       - Esperar 10 minutos
       - O ingresar el código para desbloquear inmediatamente
    
    Beneficios:
    - Protege contra ataques de fuerza bruta
    - Usuario legítimo puede desbloquear rápido con código
    - Atacante no tiene el código (está en el email)
    """
    __tablename__ = 'account_lockouts'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('usuarios.id_usuario'), nullable=False, index=True)
    
    # Cuándo se bloqueó
    locked_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Hasta cuándo está bloqueado (ej: locked_at + 10 minutos)
    locked_until = db.Column(db.DateTime, nullable=False, index=True)
    
    # Razón: 'intentos_fallidos', 'actividad_sospechosa'
    reason = db.Column(db.String(100), default='intentos_fallidos')
    
    # Código de desbloqueo de 6 dígitos
    unlock_code = db.Column(db.String(6))
    
    # El código expira (ej: 15 minutos después de enviado)
    unlock_code_expires = db.Column(db.DateTime)
    
    # ¿Está activo este bloqueo? (False si ya se desbloqueó)
    is_active = db.Column(db.Boolean, default=True, index=True)
    
    # Cuándo se desbloqueó (NULL si aún está bloqueado)
    unlocked_at = db.Column(db.DateTime)
    
    # Relación con usuario
    usuario = db.relationship('Usuario', backref='lockouts')
    
    def __repr__(self):
        return f'<AccountLockout user_id={self.user_id} until={self.locked_until}>'
    
    @staticmethod
    def generate_unlock_code():
        """
        Genera código de 6 dígitos
        
        ¿Por qué 6 dígitos?
        - Fácil de leer y escribir para el usuario
        - 1,000,000 combinaciones posibles
        - Expira en 15 minutos (tiempo limitado para adivinar)
        - Combinado con rate limiting = muy seguro
        """
        return ''.join(random.choices(string.digits, k=6))
    
    @staticmethod
    def create_lockout(user_id, minutes=10, reason='intentos_fallidos'):
        """
        Crea un nuevo bloqueo para el usuario
        
        Args:
            user_id: ID del usuario a bloquear
            minutes: Duración del bloqueo (default 10)
            reason: Razón del bloqueo
        
        Returns:
            AccountLockout: El objeto de bloqueo creado
        """
        # Desactivar bloqueos anteriores del mismo usuario
        AccountLockout.query.filter_by(
            user_id=user_id,
            is_active=True
        ).update({'is_active': False})
        
        # Crear nuevo bloqueo
        lockout = AccountLockout(
            user_id=user_id,
            locked_until=datetime.utcnow() + timedelta(minutes=minutes),
            reason=reason,
            unlock_code=AccountLockout.generate_unlock_code(),
            unlock_code_expires=datetime.utcnow() + timedelta(minutes=15)
        )
        
        db.session.add(lockout)
        db.session.commit()
        
        return lockout
    
    @staticmethod
    def get_active_lockout(user_id):
        """
        Obtiene el bloqueo activo del usuario (si existe)
        
        Returns:
            AccountLockout o None
        """
        return AccountLockout.query.filter_by(
            user_id=user_id,
            is_active=True
        ).filter(
            AccountLockout.locked_until > datetime.utcnow()
        ).first()
    
    def is_locked(self):
        """Verifica si el bloqueo aún está activo"""
        return self.is_active and datetime.utcnow() < self.locked_until
    
    def verify_unlock_code(self, code):
        """
        Verifica si el código de desbloqueo es correcto
        
        Args:
            code: Código ingresado por el usuario
        
        Returns:
            bool: True si el código es correcto y no ha expirado
        """
        if not self.unlock_code or not self.unlock_code_expires:
            return False
        
        # Verificar que no haya expirado
        if datetime.utcnow() > self.unlock_code_expires:
            return False
        
        # Verificar que el código coincida
        return self.unlock_code == code
    
    def unlock(self):
        """Desbloquea la cuenta"""
        self.is_active = False
        self.unlocked_at = datetime.utcnow()
        db.session.commit()
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'locked_at': self.locked_at.isoformat(),
            'locked_until': self.locked_until.isoformat(),
            'reason': self.reason,
            'is_active': self.is_active,
            'is_locked': self.is_locked(),
            'unlocked_at': self.unlocked_at.isoformat() if self.unlocked_at else None
        }

