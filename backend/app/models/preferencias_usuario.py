from app.extensions import db
from datetime import datetime

class PreferenciasUsuario(db.Model):
    __tablename__ = 'preferencias_usuario'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    id_usuario = db.Column(db.Integer, db.ForeignKey('usuarios.id_usuario', ondelete='CASCADE'), nullable=False, unique=True, index=True)
    idioma = db.Column(db.Enum('es', 'en', 'pt-BR', name='idioma_enum'), default='es')
    tema = db.Column(db.Enum('claro', 'oscuro', 'auto', name='tema_enum'), default='claro')
    color_primario = db.Column(db.Enum('verde', 'azul', 'rojo', 'purpura', 'naranja', 'cyan', 'rosa', 'amarillo', name='color_primario_enum'), default='verde')
    formato_fecha = db.Column(db.Enum('DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD', name='formato_fecha_enum'), default='DD/MM/YYYY')
    zona_horaria = db.Column(db.String(50), default='America/Guayaquil')
    notificaciones_email = db.Column(db.Boolean, default=True)
    notificaciones_push = db.Column(db.Boolean, default=True)
    fecha_creacion = db.Column(db.DateTime, default=datetime.utcnow)
    fecha_actualizacion = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relación
    usuario = db.relationship('Usuario', backref='preferencias', lazy='joined')
    
    def __repr__(self):
        return f'<PreferenciasUsuario {self.id_usuario}>'
    
    def to_dict(self):
        return {
            'id': self.id,
            'id_usuario': self.id_usuario,
            'idioma': self.idioma,
            'tema': self.tema,
            'color_primario': self.color_primario,
            'formato_fecha': self.formato_fecha,
            'zona_horaria': self.zona_horaria,
            'notificaciones_email': self.notificaciones_email,
            'notificaciones_push': self.notificaciones_push,
            'fecha_creacion': self.fecha_creacion.isoformat() if self.fecha_creacion else None,
            'fecha_actualizacion': self.fecha_actualizacion.isoformat() if self.fecha_actualizacion else None
        }

