from app.extensions import db
from datetime import datetime
import bcrypt

class Usuario(db.Model):
    __tablename__ = 'usuarios'
    
    id_usuario = db.Column(db.Integer, primary_key=True, autoincrement=True)
    nombre = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False, index=True)
    email_verified = db.Column(db.Boolean, default=False)
    email_verification_token = db.Column(db.String(255), nullable=True)
    contrasena = db.Column(db.String(255), nullable=False)
    password_changed_at = db.Column(db.DateTime, nullable=True)
    rol = db.Column(db.Enum('admin', 'lider', 'espectador', name='rol_enum'), default='lider')
    activo = db.Column(db.Boolean, default=True)
    failed_login_attempts = db.Column(db.Integer, default=0)
    locked_until = db.Column(db.DateTime, nullable=True) 
    fecha_registro = db.Column(db.DateTime, default=datetime.utcnow)
    fecha_actualizacion = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    last_login_at = db.Column(db.DateTime, nullable=True)
    last_login_ip = db.Column(db.String(45), nullable=True)
    
    def __repr__(self):
        return f'<Usuario {self.email}>'
    
    def set_password(self, password):
        self.contrasena = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    def check_password(self, password):
        return bcrypt.checkpw(password.encode('utf-8'), self.contrasena.encode('utf-8'))
    
    def to_dict(self):
        return {
            'id_usuario': self.id_usuario,
            'nombre': self.nombre,
            'email': self.email,
            'email_verified': self.email_verified,  # ⭐ NUEVO
            'rol': self.rol,
            'activo': self.activo,
            'failed_login_attempts': self.failed_login_attempts,  # ⭐ NUEVO
            'last_login_at': self.last_login_at.isoformat() if self.last_login_at else None,  # ⭐ NUEVO
            'last_login_ip': self.last_login_ip,  # ⭐ NUEVO
            'fecha_registro': self.fecha_registro.isoformat() if self.fecha_registro else None
        }