from app.extensions import db
from datetime import datetime

class Campeonato(db.Model):
    __tablename__ = 'campeonatos'

    id_campeonato = db.Column(db.Integer, primary_key=True, autoincrement=True)
    nombre = db.Column(db.String(100), nullable=False, unique=True)
    descripcion = db.Column(db.Text, nullable=True)
    max_equipos = db.Column(db.Integer, default=16)
    tipo_deporte = db.Column(db.Enum('futbol', 'indoor', name='tipo_deporte_enum'), default='futbol')
    tipo_competicion = db.Column(db.Enum('liga', 'eliminacion_directa', 'mixto', name='tipo_competicion_enum'), default='liga')
    fecha_inicio = db.Column(db.Date, nullable=False)
    fecha_fin = db.Column(db.Date, nullable=False)
    fecha_inicio_inscripciones = db.Column(db.Date, nullable=True)
    fecha_cierre_inscripciones = db.Column(db.Date, nullable=True)
    inscripciones_abiertas = db.Column(db.Boolean, default=True)
    estado = db.Column(db.String(50), default='planificacion', nullable=False, index=True)
    partidos_generados = db.Column(db.Boolean, default=False)
    fecha_generacion_partidos = db.Column(db.DateTime, nullable=True)
    creado_por = db.Column(db.Integer, db.ForeignKey('usuarios.id_usuario'), nullable=False, index=True)
    fecha_creacion = db.Column(db.DateTime, default=datetime.utcnow)
    codigo_inscripcion = db.Column(db.String(10), unique=True, nullable=True, index=True)
    es_publico = db.Column(db.Boolean, default=False)
    logo_url = db.Column(db.String(255), nullable=True)

    # Relaciones
    creador = db.relationship('Usuario', backref='campeonatos', lazy='joined')
    partidos = db.relationship('Partido', backref='campeonato', lazy='dynamic', cascade='all, delete-orphan')
    equipos_inscritos = db.relationship('CampeonatoEquipo', backref='campeonato', lazy='dynamic', cascade='all, delete-orphan')

    def __repr__(self):
        return f'<Campeonato {self.nombre}>'

    def to_dict(self, include_equipos=False):
        data = {
            'id_campeonato': self.id_campeonato,
            'nombre': self.nombre,
            'descripcion': self.descripcion,
            'max_equipos': self.max_equipos,
            'tipo_deporte': self.tipo_deporte,
            'tipo_competicion': self.tipo_competicion,
            'fecha_inicio': self.fecha_inicio.isoformat() if self.fecha_inicio else None,
            'fecha_fin': self.fecha_fin.isoformat() if self.fecha_fin else None,
            'fecha_inicio_inscripciones': self.fecha_inicio_inscripciones.isoformat() if self.fecha_inicio_inscripciones else None,
            'fecha_cierre_inscripciones': self.fecha_cierre_inscripciones.isoformat() if self.fecha_cierre_inscripciones else None,
            'inscripciones_abiertas': self.inscripciones_abiertas,
            'codigo_inscripcion': self.codigo_inscripcion,  # ← AGREGADO
            'es_publico': self.es_publico,
            'logo_url': self.logo_url,
            'estado': self.estado,
            'partidos_generados': self.partidos_generados,
            'fecha_generacion_partidos': self.fecha_generacion_partidos.isoformat() if self.fecha_generacion_partidos else None,
            'creado_por': self.creado_por,
            'nombre_creador': self.creador.nombre if self.creador else None,
            'fecha_creacion': self.fecha_creacion.isoformat() if self.fecha_creacion else None,
            'total_partidos': self.partidos.count(),
            'total_equipos_inscritos': self.equipos_inscritos.filter_by(estado_inscripcion='aprobado').count(),
            'total_equipos_pendientes': self.equipos_inscritos.filter_by(estado_inscripcion='pendiente').count()
        }

        if include_equipos:
            data['equipos_inscritos'] = [eq.to_dict() for eq in self.equipos_inscritos.all()]

        return data