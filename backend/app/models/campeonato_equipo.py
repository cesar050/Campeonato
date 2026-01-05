from app.extensions import db
from datetime import datetime

class CampeonatoEquipo(db.Model):
    __tablename__ = 'campeonato_equipos'

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    id_campeonato = db.Column(db.Integer, db.ForeignKey('campeonatos.id_campeonato', ondelete='CASCADE'), nullable=False, index=True)
    id_equipo = db.Column(db.Integer, db.ForeignKey('equipos.id_equipo', ondelete='CASCADE'), nullable=False, index=True)
    fecha_inscripcion = db.Column(db.DateTime, default=datetime.utcnow)
    estado_inscripcion = db.Column(db.Enum('pendiente', 'aprobado', 'rechazado', name='estado_inscripcion_enum'), default='pendiente', index=True)
    observaciones = db.Column(db.Text, nullable=True)
    grupo = db.Column(db.String(1), nullable=True)
    numero_sorteo = db.Column(db.Integer, nullable=True)

    # Relaciones
    equipo = db.relationship('Equipo', backref='inscripciones_campeonatos', lazy='joined')

    def __repr__(self):
        return f'<CampeonatoEquipo campeonato={self.id_campeonato} equipo={self.id_equipo}>'

    def to_dict(self, include_equipo=True):
        data = {
            'id': self.id,
            'id_campeonato': self.id_campeonato,
            'id_equipo': self.id_equipo,
            'fecha_inscripcion': self.fecha_inscripcion.isoformat() if self.fecha_inscripcion else None,
            'estado_inscripcion': self.estado_inscripcion,
            'observaciones': self.observaciones,
            'grupo': self.grupo,
            'numero_sorteo': self.numero_sorteo
        }

        if include_equipo and self.equipo:
            data['equipo'] = {
                'id_equipo': self.equipo.id_equipo,
                'nombre': self.equipo.nombre,
                'logo_url': self.equipo.logo_url,
                'estadio': self.equipo.estadio,
                'lider': {
                    'id_usuario': self.equipo.lider.id_usuario,
                    'nombre': self.equipo.lider.nombre,
                    'email': self.equipo.lider.email
                } if self.equipo.lider else None,
                'total_jugadores': self.equipo.jugadores.filter_by(activo=True).count()
            }

        return data