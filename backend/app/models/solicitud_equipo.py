from app.extensions import db
from datetime import datetime

class SolicitudEquipo(db.Model):
    __tablename__ = 'solicitudes_equipo'
    
    id_solicitud = db.Column(db.Integer, primary_key=True, autoincrement=True)
    id_equipo = db.Column(db.Integer, db.ForeignKey('equipos.id_equipo', ondelete='CASCADE'), nullable=False, index=True)
    id_lider = db.Column(db.Integer, db.ForeignKey('usuarios.id_usuario', ondelete='CASCADE'), nullable=False, index=True)
    fecha_solicitud = db.Column(db.DateTime, default=datetime.utcnow)
    estado = db.Column(db.Enum('pendiente', 'aprobada', 'rechazada', name='estado_solicitud_enum'), default='pendiente', index=True)
    observaciones = db.Column(db.Text, nullable=True)
    revisado_por = db.Column(db.Integer, db.ForeignKey('usuarios.id_usuario', ondelete='SET NULL'), nullable=True)
    fecha_revision = db.Column(db.DateTime, nullable=True)
    
    # RELACIONES
    equipo = db.relationship('Equipo', foreign_keys=[id_equipo], backref='solicitudes', lazy='joined')
    lider = db.relationship('Usuario', foreign_keys=[id_lider], backref='solicitudes_hechas')
    revisor = db.relationship('Usuario', foreign_keys=[revisado_por], backref='solicitudes_revisadas')
    
    def __repr__(self):
        return f'<SolicitudEquipo {self.equipo.nombre if self.equipo else "?"} - {self.estado}>'
    
    def to_dict(self):
        return {
            'id_solicitud': self.id_solicitud,
            'id_equipo': self.id_equipo,
            'equipo': self.equipo.nombre if self.equipo else None,
            'id_lider': self.id_lider,
            'lider': self.lider.nombre if self.lider else None,
            'fecha_solicitud': self.fecha_solicitud.isoformat() if self.fecha_solicitud else None,
            'estado': self.estado,
            'observaciones': self.observaciones,
            'revisado_por': self.revisado_por,
            'revisor': self.revisor.nombre if self.revisor else None,
            'fecha_revision': self.fecha_revision.isoformat() if self.fecha_revision else None
        }