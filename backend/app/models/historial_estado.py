from app.extensions import db
from datetime import datetime

class HistorialEstado(db.Model):
    __tablename__ = 'historial_estados'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    tipo_entidad = db.Column(db.Enum('campeonato', 'equipo', 'partido', 'inscripcion', name='tipo_entidad_enum'), nullable=False, index=True)
    id_entidad = db.Column(db.Integer, nullable=False, index=True)
    estado_anterior = db.Column(db.String(50), nullable=True)
    estado_nuevo = db.Column(db.String(50), nullable=False)
    cambiado_por = db.Column(db.Integer, db.ForeignKey('usuarios.id_usuario', ondelete='CASCADE'), nullable=False)
    fecha_cambio = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    observaciones = db.Column(db.Text, nullable=True)

    # Relaciones
    usuario = db.relationship('Usuario', backref='cambios_realizados', lazy='joined')

    def __repr__(self):
        return f'<HistorialEstado {self.tipo_entidad} {self.id_entidad}: {self.estado_anterior} -> {self.estado_nuevo}>'

    def to_dict(self):
        return {
            'id': self.id,
            'tipo_entidad': self.tipo_entidad,
            'id_entidad': self.id_entidad,
            'estado_anterior': self.estado_anterior,
            'estado_nuevo': self.estado_nuevo,
            'cambiado_por': self.cambiado_por,
            'nombre_usuario': self.usuario.nombre if self.usuario else None,
            'fecha_cambio': self.fecha_cambio.isoformat() if self.fecha_cambio else None,
            'observaciones': self.observaciones
        }