from app.extensions import db

class Alineacion(db.Model):
    __tablename__ = 'alineaciones'
    
    id_alineacion = db.Column(db.Integer, primary_key=True, autoincrement=True)
    id_partido = db.Column(db.Integer, db.ForeignKey('partidos.id_partido', ondelete='CASCADE'), nullable=False, index=True)
    id_equipo = db.Column(db.Integer, db.ForeignKey('equipos.id_equipo', ondelete='CASCADE'), nullable=False, index=True)
    id_jugador = db.Column(db.Integer, db.ForeignKey('jugadores.id_jugador', ondelete='CASCADE'), nullable=False, index=True)
    titular = db.Column(db.Boolean, default=True)
    minuto_entrada = db.Column(db.Integer, default=0)
    minuto_salida = db.Column(db.Integer, nullable=True)
    
    __table_args__ = (
        db.UniqueConstraint('id_partido', 'id_jugador', name='unique_jugador_partido'),
    )
    
    # RELACIONES
    equipo = db.relationship('Equipo', backref='alineaciones', lazy='joined')
    jugador = db.relationship('Jugador', backref='alineaciones', lazy='joined')
    
    def __repr__(self):
        estado = "Titular" if self.titular else "Suplente"
        return f'<Alineacion {self.jugador.nombre if self.jugador else "?"} - {estado}>'
    
    def to_dict(self):
        return {
            'id_alineacion': self.id_alineacion,
            'id_partido': self.id_partido,
            'id_equipo': self.id_equipo,
            'equipo': self.equipo.nombre if self.equipo else None,
            'id_jugador': self.id_jugador,
            'jugador': self.jugador.nombre if self.jugador else None,
            'jugador_completo': f"{self.jugador.nombre} {self.jugador.apellido}" if self.jugador else None,
            'dorsal': self.jugador.dorsal if self.jugador else None,
            'posicion': self.jugador.posicion if self.jugador else None,
            'titular': self.titular,
            'minuto_entrada': self.minuto_entrada,
            'minuto_salida': self.minuto_salida
        }
