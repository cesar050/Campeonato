from app.extensions import db
from datetime import datetime

class Alineacion(db.Model):
    __tablename__ = 'alineaciones'
    
    id_alineacion = db.Column(db.Integer, primary_key=True, autoincrement=True)
    id_partido = db.Column(db.Integer, nullable=False, index=True)
    id_equipo = db.Column(db.Integer, nullable=False, index=True)
    id_jugador = db.Column(db.Integer, nullable=False, index=True)
    titular = db.Column(db.Boolean, default=True)
    minuto_entrada = db.Column(db.Integer, default=0)
    minuto_salida = db.Column(db.Integer, nullable=True)
    fecha_creacion = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self):
        return {
            'id_alineacion': self.id_alineacion,
            'id_partido': self.id_partido,
            'id_equipo': self.id_equipo,
            'id_jugador': self.id_jugador,
            'titular': self.titular,
            'minuto_entrada': self.minuto_entrada,
            'minuto_salida': self.minuto_salida,
            'fecha_creacion': self.fecha_creacion.isoformat() if self.fecha_creacion else None
        }