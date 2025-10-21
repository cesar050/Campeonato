from app.extensions import db
from datetime import datetime

class Tarjeta(db.Model):
    __tablename__ = 'tarjetas'
    
    id_tarjeta = db.Column(db.Integer, primary_key=True, autoincrement=True)
    id_partido = db.Column(db.Integer, db.ForeignKey('partidos.id_partido', ondelete='CASCADE'), nullable=False, index=True)
    id_jugador = db.Column(db.Integer, db.ForeignKey('jugadores.id_jugador', ondelete='CASCADE'), nullable=False, index=True)
    tipo = db.Column(db.Enum('amarilla', 'roja', name='tipo_tarjeta_enum'), nullable=False)
    minuto = db.Column(db.Integer, nullable=False)
    motivo = db.Column(db.String(255), nullable=True)
    fecha_registro = db.Column(db.DateTime, default=datetime.utcnow)
    
    # RELACIONES
    jugador = db.relationship('Jugador', backref='tarjetas', lazy='joined')
    
    def __repr__(self):
        return f'<Tarjeta {self.tipo.upper()} - {self.jugador.nombre if self.jugador else "?"}>'
    
    def to_dict(self):
        return {
            'id_tarjeta': self.id_tarjeta,
            'id_partido': self.id_partido,
            'id_jugador': self.id_jugador,
            'jugador': self.jugador.nombre if self.jugador else None,
            'tipo': self.tipo,
            'minuto': self.minuto,
            'motivo': self.motivo,
            'fecha_registro': self.fecha_registro.isoformat() if self.fecha_registro else None
        }