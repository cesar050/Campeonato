from app.extensions import db
from datetime import datetime

class Jugador(db.Model):
    __tablename__ = 'jugadores'
    
    id_jugador = db.Column(db.Integer, primary_key=True, autoincrement=True)
    id_equipo = db.Column(db.Integer, db.ForeignKey('equipos.id_equipo', ondelete='CASCADE'), nullable=False, index=True)
    nombre = db.Column(db.String(100), nullable=False)
    apellido = db.Column(db.String(100), nullable=False)
    documento = db.Column(db.String(20), unique=True, nullable=False, index=True)
    dorsal = db.Column(db.Integer, nullable=False)
    documento_pdf = db.Column(db.String(255), nullable=True)
    posicion = db.Column(db.Enum('portero', 'defensa', 'mediocampista', 'delantero', name='posicion_enum'), default='delantero')
    fecha_nacimiento = db.Column(db.Date, nullable=True)
    fecha_registro = db.Column(db.DateTime, default=datetime.utcnow)
    activo = db.Column(db.Boolean, default=True)
    
    __table_args__ = (
        db.UniqueConstraint('id_equipo', 'dorsal', name='unique_dorsal_equipo'),
    )
    
    def __repr__(self):
        return f'<Jugador {self.nombre} {self.apellido}>'
    
    def to_dict(self):
        return {
            'id_jugador': self.id_jugador,
            'id_equipo': self.id_equipo,
            'nombre': self.nombre,
            'apellido': self.apellido,
            'nombre_completo': f"{self.nombre} {self.apellido}",
            'documento': self.documento,
            'dorsal': self.dorsal,
            'documento_pdf': self.documento_pdf,
            'posicion': self.posicion,
            'fecha_nacimiento': self.fecha_nacimiento.isoformat() if self.fecha_nacimiento else None,
            'activo': self.activo,
            'equipo': self.equipo.nombre if self.equipo else None
        }
