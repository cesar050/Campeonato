from app.enums.partido_enums import EstadoPartido
from app.extensions import db
from datetime import datetime
class Partido(db.Model):
    __tablename__ = 'partidos'
    id_partido = db.Column(db.Integer, primary_key = True, autoincrement = True)
    id_campeonato = db.Column(db.Integer, db.ForeignKey('campeonatos.id_campeonato'), nullable = False)
    id_equipo_local = db.Column(db.Integer, db.ForeignKey('equipos.id_equipo'), nullable= False)
    id_equipo_visitante = db.Column(db.Integer, db.ForeignKey('equipos.id_equipo'), nullable = False)
    fecha_partido = db.Column(db.DateTime, nullable= False)
    lugar = db.Column(db.Text, nullable = True)
    jornada = db.Column(db.Integer, default = 1)
    goles_local = db.Column(db.Integer, default = 0)
    goles_visitante = db.Column(db.Integer, default = 0)
    estado  = db.Column(
        db.Enum(EstadoPartido),
        index=True
    )
    observaciones = db.Column(db.Text, nullable = True)
    fecha_creacion = db.Column(db.DateTime, default= datetime.utcnow)
    __table_args__ = (
        db.CheckConstraint('id_equipo_local != id_equipo_visitante',
                            name= 'check_equipos_diferentes'),
    )
    
    equipo_local = db.relationship('Equipo',foreign_keys=[id_equipo_local])
    equipo_visitante = db.relationship('Equipo', foreign_keys = [id_equipo_visitante])
    goles = db.relationship('Gol', backref= 'partido')
    tarjetas = db.relationship('Tarjeta', backref = 'partido')
    alineaciones = db.relationship('Alineacion', backref = 'partido')

    def __repr__(self):
        return f'<Partido {self.equipo_local.nombre} va {self.equipo_visitante.nombre}>'
    
    def to_dict(self):
        return{
            'id_partido' : self.id_partido,
            'id_campeonato': self.id_campeonato,
            'id_equipo_local': self.id_equipo_local,
            'id_equipo_visitante':self.id_equipo_visitante,
            'fecha_partido':self.fecha_partido.isoformat() if self.fecha_partido else None,
            'lugar':self.lugar,
            'jornada': self.jornada,
            'estado': self.estado,
            'observaciones': self.observaciones,
            'total_goles': self.goles.count(),
            'total_tarjetas':self.tarjetas.count()

        }
