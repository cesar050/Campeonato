from app.enums.campeonato_enums import EstadoCampeonato
from app.extensions import db
from datetime import datetime

class Campeonato(db.Model):
    __tablename__ = 'campeonatos'
    id_campeonato = db.Column(db.Integer, primary_key= True, autoincrement= True)
    nombre = db.Column(db.String(100), nullable= False, unique=True)
    descripcion = db.Column(db.Text, nullable = True)
    fecha_inicio = db.Column(db.Date, nullable= False)
    fecha_fin = db.Column(db.Date, nullable= False)
    estado = db.Column(
    db.String(50),
    default='planificacion',
    nullable=False,
    index=True
)
    max_equipos = db.Column(db.Integer, default=16)
    partidos_generados = db.Column(db.Boolean, default=False)
    fecha_generacion_partidos = db.Column(db.DateTime, nullable=True)
    creado_por = db.Column(db.Integer, db.ForeignKey('usuarios.id_usuario'), nullable= False, index=True)
    fecha_creacion = db.Column(db.DateTime, default=datetime.utcnow)
    creador = db.relationship('Usuario', backref='campeonatos', lazy='joined')
    partidos = db.relationship('Partido', backref='campeonato', lazy='dynamic', cascade='all, delete-orphan')

    def __repr__(self):
        return f'<Campeonato {self.nombre}>'

    def to_dict(self):
        return {
            'id_campeonato': self.id_campeonato,
            'nombre': self.nombre,
            'descripcion': self.descripcion,
            'fecha_inicio': self.fecha_inicio.isoformat() if self.fecha_inicio else None,
            'fecha_fin': self.fecha_fin.isoformat() if self.fecha_fin else None,
            'estado': self.estado,
            'creado_por': self.creado_por,
            'nombre_creador': self.creador.nombre if self.creador else None,
            'fecha_creacion': self.fecha_creacion.isoformat() if self.fecha_creacion else None,
            'total_partidos': self.partidos.count()
        }
