from app.enums.gol_enum import TipoGol
from app.extensions import db
from datetime import datetime

class Gol(db.Model):
    __tablename__ = 'goles'
    
    id_gol = db.Column(db.Integer, primary_key=True, autoincrement=True)
    id_partido = db.Column(db.Integer, db.ForeignKey('partidos.id_partido'), nullable=False, index=True)
    id_jugador = db.Column(db.Integer, db.ForeignKey('jugadores.id_jugador'), nullable=False, index=True)
    minuto = db.Column(db.Integer, nullable=False)
    tipo = db.Column(
        db.Enum(TipoGol),
        default=TipoGol.NORMAL,
        index=True
    )
    fecha_registro = db.Column(db.DateTime, default=datetime.utcnow)
    
    jugador = db.relationship('Jugador', backref='goles_marcados', lazy='joined')
    
    def __repr__(self):
        return f'<Gol {self.jugador.nombre if self.jugador else "?"} - Minuto {self.minuto}>'
    
    def to_dict(self):
        return {
            'id_gol': self.id_gol,
            'id_partido': self.id_partido,
            'id_jugador': self.id_jugador,
            'jugador': self.jugador.nombre if self.jugador else None,
            'minuto': self.minuto,
            'tipo': self.tipo.value if self.tipo else None,
            'fecha_registro': self.fecha_registro.isoformat() if self.fecha_registro else None
        }