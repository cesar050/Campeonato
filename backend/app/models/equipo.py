from app.extensions import db
from datetime import datetime

class Equipo(db.Model):
    __tablename__ = 'equipos'
    
    id_equipo = db.Column(db.Integer, primary_key=True, autoincrement=True)
    nombre = db.Column(db.String(100), nullable=False, unique=True)
    logo_url = db.Column(db.String(255), nullable=True)
    id_lider = db.Column(db.Integer, db.ForeignKey('usuarios.id_usuario', ondelete='CASCADE'), nullable=False, index=True)
    fecha_registro = db.Column(db.DateTime, default=datetime.utcnow)
    fecha_aprobacion = db.Column(db.DateTime, nullable=True)
    estado = db.Column(db.Enum('pendiente', 'aprobado', 'rechazado', name='estado_equipo_enum'), default='pendiente', index=True)
    observaciones = db.Column(db.Text, nullable=True)
    aprobado_por = db.Column(db.Integer, db.ForeignKey('usuarios.id_usuario', ondelete='SET NULL'), nullable=True)
    estadio = db.Column(db.String(150), nullable=True)
    
    # Relaciones
    lider = db.relationship('Usuario', foreign_keys=[id_lider], backref='equipos_liderados', lazy='joined')
    aprobador = db.relationship('Usuario', foreign_keys=[aprobado_por], backref='equipos_aprobados')
    jugadores = db.relationship('Jugador', backref='equipo', lazy='dynamic', cascade='all, delete-orphan')
    
    def __repr__(self):
        return f'<Equipo {self.nombre}>'
    
    def to_dict(self, include_jugadores=False):
        data = {
            'id_equipo': self.id_equipo,
            'nombre': self.nombre,
            'logo_url': self.logo_url,
            'id_lider': self.id_lider,
            'nombre_lider': self.lider.nombre if self.lider else None,
            'fecha_registro': self.fecha_registro.isoformat() if self.fecha_registro else None,
            'fecha_aprobacion': self.fecha_aprobacion.isoformat() if self.fecha_aprobacion else None,
            'estado': self.estado,
            'observaciones': self.observaciones,
            'total_jugadores': self.jugadores.count(),
            'estadio': self.estadio
        }
        
        if include_jugadores:
            data['jugadores'] = [j.to_dict() for j in self.jugadores.all()]
        
        return data
