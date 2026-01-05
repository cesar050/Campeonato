from app.extensions import db
from datetime import datetime

class Partido(db.Model):
    __tablename__ = 'partidos'
    
    id_partido = db.Column(db.Integer, primary_key=True, autoincrement=True)
    id_campeonato = db.Column(db.Integer, db.ForeignKey('campeonatos.id_campeonato'), nullable=False)
    id_equipo_local = db.Column(db.Integer, db.ForeignKey('equipos.id_equipo'), nullable=False)
    id_equipo_visitante = db.Column(db.Integer, db.ForeignKey('equipos.id_equipo'), nullable=False)
    fecha_partido = db.Column(db.DateTime, nullable=False)
    lugar = db.Column(db.String(100), nullable=True)
    jornada = db.Column(db.Integer, default=1)
    goles_local = db.Column(db.Integer, default=0)
    goles_visitante = db.Column(db.Integer, default=0)
    estado = db.Column(db.String(50), default='programado', nullable=False, index=True)
    observaciones = db.Column(db.Text, nullable=True)
    
    # Columnas de inmutabilidad
    resultado_registrado = db.Column(db.Boolean, default=False, nullable=False)
    registrado_por = db.Column(db.Integer, db.ForeignKey('usuarios.id_usuario'), nullable=True)
    fecha_registro_resultado = db.Column(db.DateTime, nullable=True)
    fecha_creacion = db.Column(db.DateTime, default=datetime.utcnow)
    
    __table_args__ = (
        db.CheckConstraint('id_equipo_local != id_equipo_visitante', name='check_equipos_diferentes'),
    )
    
    # ========== RELATIONSHIPS ==========
    equipo_local = db.relationship('Equipo', foreign_keys=[id_equipo_local])
    equipo_visitante = db.relationship('Equipo', foreign_keys=[id_equipo_visitante])
    usuario_registro = db.relationship('Usuario', foreign_keys=[registrado_por])
    goles = db.relationship('Gol', backref='partido', lazy='dynamic')
    tarjetas = db.relationship('Tarjeta', backref='partido', lazy='dynamic')
    
    def __repr__(self):
        return f'<Partido {self.id_partido}>'
    
    def to_dict(self):
        return {
            'id_partido': self.id_partido,
            'id_campeonato': self.id_campeonato,
            
            # 🔥 INCLUIR OBJETO CAMPEONATO COMPLETO CON TIPO_DEPORTE
            'campeonato': {
                'id_campeonato': self.campeonato.id_campeonato,
                'nombre': self.campeonato.nombre,
                'tipo_deporte': self.campeonato.tipo_deporte
            } if hasattr(self, 'campeonato') and self.campeonato else None,
            
            'id_equipo_local': self.id_equipo_local,
            'equipo_local': self.equipo_local.nombre if self.equipo_local else None,
            'id_equipo_visitante': self.id_equipo_visitante,
            'equipo_visitante': self.equipo_visitante.nombre if self.equipo_visitante else None,
            'fecha_partido': self.fecha_partido.isoformat() if self.fecha_partido else None,
            'lugar': self.lugar,
            'jornada': self.jornada,
            'goles_local': self.goles_local,
            'goles_visitante': self.goles_visitante,
            'estado': self.estado,
            'observaciones': self.observaciones,
            'resultado_registrado': self.resultado_registrado,
            'registrado_por': self.registrado_por,
            'fecha_registro_resultado': self.fecha_registro_resultado.isoformat() if self.fecha_registro_resultado else None,
            'fecha_creacion': self.fecha_creacion.isoformat() if self.fecha_creacion else None,
            'total_goles': self.goles.count(),
            'total_tarjetas': self.tarjetas.count()
        }