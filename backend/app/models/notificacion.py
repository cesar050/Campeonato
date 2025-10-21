from app.extensions import db
from datetime import datetime

class Notificacion(db.Model):
    __tablename__ = 'notificaciones'
    
    id_notificacion = db.Column(db.Integer, primary_key=True, autoincrement=True)
    id_usuario = db.Column(db.Integer, db.ForeignKey('usuarios.id_usuario', ondelete='CASCADE'), nullable=False, index=True)
    titulo = db.Column(db.String(150), nullable=False)
    mensaje = db.Column(db.Text, nullable=False)
    tipo = db.Column(db.Enum('info', 'warning', 'success', 'error', name='tipo_notificacion_enum'), default='info')
    leida = db.Column(db.Boolean, default=False, index=True)
    fecha_envio = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    
    # RELACIONES
    usuario = db.relationship('Usuario', backref='notificaciones', lazy='joined')
    
    def __repr__(self):
        return f'<Notificacion {self.titulo}>'
    
    def to_dict(self):
        return {
            'id_notificacion': self.id_notificacion,
            'id_usuario': self.id_usuario,
            'usuario': self.usuario.nombre if self.usuario else None,
            'titulo': self.titulo,
            'mensaje': self.mensaje,
            'tipo': self.tipo,
            'leida': self.leida,
            'fecha_envio': self.fecha_envio.isoformat() if self.fecha_envio else None
        }
