from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.extensions import db
from app.models.usuario import Usuario
from app.models.partido import Partido
from app.models.equipo import Equipo
from app.models.jugador import Jugador
from datetime import datetime

eventos_bp = Blueprint('eventos', __name__)

# ============================================
# HELPER PARA EXTRAER USER_ID DEL TOKEN
# ============================================
def get_user_id_from_token():
    """
    Extrae el user_id del token JWT.
    Maneja identity como int (correcto) o dict (legacy).
    """
    identity = get_jwt_identity()
    
    if isinstance(identity, int):
        return identity
    elif isinstance(identity, str):
        return int(identity)
    elif isinstance(identity, dict):
        return identity.get('id_usuario')
    else:
        raise ValueError("Token inválido")

# ============================================
# MODELO TEMPORAL PARA EVENTOS (SQLAlchemy)
# ============================================
class EventoPartido(db.Model):
    __tablename__ = 'eventos_partido'
    
    id_evento = db.Column(db.Integer, primary_key=True, autoincrement=True)
    id_partido = db.Column(db.Integer, db.ForeignKey('partidos.id_partido', ondelete='CASCADE'), nullable=False)
    id_equipo = db.Column(db.Integer, db.ForeignKey('equipos.id_equipo'), nullable=False)
    id_jugador = db.Column(db.Integer, db.ForeignKey('jugadores.id_jugador'), nullable=False)
    tipo = db.Column(db.Enum('gol', 'tarjeta_amarilla', 'tarjeta_roja', 'sustitucion'), nullable=False)
    minuto = db.Column(db.Integer, nullable=False)
    id_asistidor = db.Column(db.Integer, db.ForeignKey('jugadores.id_jugador', ondelete='SET NULL'), nullable=True)
    datos_adicionales = db.Column(db.JSON, nullable=True)
    fecha_registro = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relaciones
    partido = db.relationship('Partido', backref='eventos')
    equipo = db.relationship('Equipo', foreign_keys=[id_equipo])
    jugador = db.relationship('Jugador', foreign_keys=[id_jugador])
    asistidor = db.relationship('Jugador', foreign_keys=[id_asistidor])
    
    def to_dict(self):
        return {
            'id_evento': self.id_evento,
            'id_partido': self.id_partido,
            'id_equipo': self.id_equipo,
            'id_jugador': self.id_jugador,
            'tipo': self.tipo,
            'minuto': self.minuto,
            'id_asistidor': self.id_asistidor,
            'datos_adicionales': self.datos_adicionales,
            'fecha_registro': self.fecha_registro.isoformat() if self.fecha_registro else None,
            'jugador_nombre': f"{self.jugador.nombre} {self.jugador.apellido}" if self.jugador else None,
            'jugador_dorsal': self.jugador.dorsal if self.jugador else None,
            'asistidor_nombre': f"{self.asistidor.nombre} {self.asistidor.apellido}" if self.asistidor else None,
            'asistidor_dorsal': self.asistidor.dorsal if self.asistidor else None,
            'equipo_nombre': self.equipo.nombre if self.equipo else None
        }


# ============================================
# REGISTRAR EVENTO DE PARTIDO
# ============================================
@eventos_bp.route('/organizador/partidos/<int:id_partido>/eventos', methods=['POST'])
@jwt_required()
def registrar_evento(id_partido):
    """Registra un evento (gol, tarjeta, sustitución) en un partido"""
    try:
        user_id = get_user_id_from_token()
        usuario = Usuario.query.get(user_id)

        if not usuario:
            return jsonify({'error': 'No autorizado'}), 403

        # Verificar que el partido existe
        partido = Partido.query.get(id_partido)
        if not partido:
            return jsonify({'error': 'Partido no encontrado'}), 404

        # Verificar permisos
        campeonato = partido.campeonato
        
        es_organizador = usuario.rol == 'organizador' and campeonato.id_organizador == usuario.id_usuario
        es_superadmin = usuario.rol == 'superadmin'
        es_admin = usuario.rol == 'admin'
        es_lider_participante = False
        
        if usuario.rol == 'lider':
            equipos_lider = Equipo.query.filter_by(id_lider=usuario.id_usuario).all()
            id_equipos_lider = [e.id_equipo for e in equipos_lider]
            es_lider_participante = (partido.id_equipo_local in id_equipos_lider or 
                                    partido.id_equipo_visitante in id_equipos_lider)
        
        if not (es_organizador or es_superadmin or es_admin or es_lider_participante):
            return jsonify({'error': 'No tienes permisos para registrar eventos en este partido'}), 403

        # Validar que el partido esté en juego
        if partido.estado != 'en_juego':
            return jsonify({'error': 'Solo se pueden registrar eventos en partidos en juego'}), 400

        data = request.get_json()
        
        # Validaciones
        if not data.get('tipo') or data['tipo'] not in ['gol', 'tarjeta_amarilla', 'tarjeta_roja', 'sustitucion']:
            return jsonify({'error': 'Tipo de evento inválido'}), 400
        
        if not data.get('id_jugador'):
            return jsonify({'error': 'ID de jugador requerido'}), 400
        
        if not data.get('id_equipo'):
            return jsonify({'error': 'ID de equipo requerido'}), 400
        
        if data.get('minuto') is None:
            return jsonify({'error': 'Minuto requerido'}), 400
        
        # Verificar que el equipo participa en el partido
        if data['id_equipo'] not in [partido.id_equipo_local, partido.id_equipo_visitante]:
            return jsonify({'error': 'El equipo no participa en este partido'}), 400
        
        # Verificar que el jugador existe
        jugador = Jugador.query.get(data['id_jugador'])
        if not jugador:
            return jsonify({'error': 'Jugador no encontrado'}), 404
        
        # Verificar que el jugador pertenece al equipo
        if jugador.id_equipo != data['id_equipo']:
            return jsonify({'error': 'El jugador no pertenece a este equipo'}), 400
        
        # Validar asistidor si es un gol
        id_asistidor = None
        if data['tipo'] == 'gol' and data.get('id_asistidor'):
            asistidor = Jugador.query.get(data['id_asistidor'])
            if not asistidor:
                return jsonify({'error': 'Asistidor no encontrado'}), 404
            if asistidor.id_equipo != data['id_equipo']:
                return jsonify({'error': 'El asistidor debe ser del mismo equipo'}), 400
            id_asistidor = data['id_asistidor']
        
        # Crear evento
        nuevo_evento = EventoPartido(
            id_partido=id_partido,
            id_equipo=data['id_equipo'],
            id_jugador=data['id_jugador'],
            tipo=data['tipo'],
            minuto=data['minuto'],
            id_asistidor=id_asistidor,
            datos_adicionales=data.get('datos_adicionales')
        )
        
        db.session.add(nuevo_evento)
        
        # Actualizar marcador si es gol
        if data['tipo'] == 'gol':
            if data['id_equipo'] == partido.id_equipo_local:
                partido.goles_local += 1
            else:
                partido.goles_visitante += 1
        
        db.session.commit()
        
        return jsonify({
            'mensaje': f'Evento registrado exitosamente',
            'evento': nuevo_evento.to_dict(),
            'marcador': {
                'local': partido.goles_local,
                'visitante': partido.goles_visitante
            }
        }), 201
        
    except Exception as e:
        db.session.rollback()
        print(f"❌ ERROR en registrar_evento: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


# ============================================
# OBTENER EVENTOS DE PARTIDO (ORGANIZADOR)
# ============================================
@eventos_bp.route('/organizador/partidos/<int:id_partido>/eventos', methods=['GET'])
@jwt_required()
def obtener_eventos(id_partido):
    """Obtiene todos los eventos de un partido"""
    try:
        user_id = get_user_id_from_token()
        usuario = Usuario.query.get(user_id)
        
        if not usuario:
            return jsonify({'error': 'Usuario no encontrado'}), 403
        
        partido = Partido.query.get(id_partido)
        if not partido:
            return jsonify({'error': 'Partido no encontrado'}), 404
        
        # Verificar permisos
        campeonato = partido.campeonato
        
        es_organizador = usuario.rol == 'organizador' and campeonato.id_organizador == usuario.id_usuario
        es_superadmin = usuario.rol == 'superadmin'
        es_admin = usuario.rol == 'admin'
        
        if not (es_organizador or es_superadmin or es_admin):
            return jsonify({'error': 'No autorizado para ver eventos de este partido'}), 403
        
        # Obtener eventos ordenados por minuto
        eventos = EventoPartido.query.filter_by(id_partido=id_partido).order_by(EventoPartido.minuto.desc()).all()
        
        return jsonify({
            'eventos': [evento.to_dict() for evento in eventos],
            'total': len(eventos),
            'goles_local': partido.goles_local,
            'goles_visitante': partido.goles_visitante
        }), 200
        
    except Exception as e:
        print(f"❌ ERROR en obtener_eventos: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


# ============================================
# ELIMINAR EVENTO (POR SI HUBO ERROR)
# ============================================
@eventos_bp.route('/organizador/partidos/<int:id_partido>/eventos/<int:id_evento>', methods=['DELETE'])
@jwt_required()
def eliminar_evento(id_partido, id_evento):
    """Elimina un evento registrado (para corregir errores)"""
    try:
        user_id = get_user_id_from_token()
        usuario = Usuario.query.get(user_id)
        
        if not usuario:
            return jsonify({'error': 'Usuario no encontrado'}), 403
        
        partido = Partido.query.get(id_partido)
        if not partido:
            return jsonify({'error': 'Partido no encontrado'}), 404
        
        # Verificar permisos
        campeonato = partido.campeonato
        es_organizador = usuario.rol == 'organizador' and campeonato.id_organizador == usuario.id_usuario
        es_superadmin = usuario.rol == 'superadmin'
        es_admin = usuario.rol == 'admin'
        
        if not (es_organizador or es_superadmin or es_admin):
            return jsonify({'error': 'No autorizado'}), 403
        
        evento = EventoPartido.query.get(id_evento)
        if not evento or evento.id_partido != id_partido:
            return jsonify({'error': 'Evento no encontrado'}), 404
        
        # Actualizar marcador si es gol
        if evento.tipo == 'gol':
            if evento.id_equipo == partido.id_equipo_local:
                partido.goles_local = max(0, partido.goles_local - 1)
            else:
                partido.goles_visitante = max(0, partido.goles_visitante - 1)
        
        db.session.delete(evento)
        db.session.commit()
        
        return jsonify({
            'mensaje': 'Evento eliminado',
            'marcador': {
                'local': partido.goles_local,
                'visitante': partido.goles_visitante
            }
        }), 200
        
    except Exception as e:
        db.session.rollback()
        print(f"❌ ERROR en eliminar_evento: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


# ============================================
# OBTENER ESTADÍSTICAS DEL PARTIDO
# ============================================
@eventos_bp.route('/organizador/partidos/<int:id_partido>/estadisticas', methods=['GET'])
@jwt_required()
def obtener_estadisticas_partido(id_partido):
    """Obtiene estadísticas del partido (goles, tarjetas por equipo)"""
    try:
        user_id = get_user_id_from_token()
        usuario = Usuario.query.get(user_id)
        
        if not usuario:
            return jsonify({'error': 'No autorizado'}), 403
        
        partido = Partido.query.get(id_partido)
        if not partido:
            return jsonify({'error': 'Partido no encontrado'}), 404
        
        eventos = EventoPartido.query.filter_by(id_partido=id_partido).all()
        
        # Estadísticas por equipo
        stats_local = {
            'goles': 0,
            'tarjetas_amarillas': 0,
            'tarjetas_rojas': 0,
            'goleadores': {}
        }
        
        stats_visitante = {
            'goles': 0,
            'tarjetas_amarillas': 0,
            'tarjetas_rojas': 0,
            'goleadores': {}
        }
        
        for evento in eventos:
            stats = stats_local if evento.id_equipo == partido.id_equipo_local else stats_visitante
            
            if evento.tipo == 'gol':
                stats['goles'] += 1
                jugador_key = f"{evento.jugador.nombre} {evento.jugador.apellido}"
                stats['goleadores'][jugador_key] = stats['goleadores'].get(jugador_key, 0) + 1
            elif evento.tipo == 'tarjeta_amarilla':
                stats['tarjetas_amarillas'] += 1
            elif evento.tipo == 'tarjeta_roja':
                stats['tarjetas_rojas'] += 1
        
        return jsonify({
            'local': stats_local,
            'visitante': stats_visitante,
            'total_eventos': len(eventos)
        }), 200
        
    except Exception as e:
        print(f"❌ ERROR en obtener_estadisticas_partido: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


# ============================================
# LÍDER - OBTENER EVENTOS DE PARTIDO
# ============================================
@eventos_bp.route('/lider/partidos/<int:id_partido>/eventos', methods=['GET'])
@jwt_required()
def obtener_eventos_lider(id_partido):
    """Obtiene todos los eventos de un partido para el líder"""
    try:
        user_id = get_user_id_from_token()
        usuario = Usuario.query.get(user_id)
        
        if not usuario or usuario.rol != 'lider':
            return jsonify({'error': 'No autorizado'}), 403
        
        partido = Partido.query.get(id_partido)
        if not partido:
            return jsonify({'error': 'Partido no encontrado'}), 404
        
        # Verificar que el líder tiene un equipo en este partido
        equipos_lider = Equipo.query.filter_by(id_lider=usuario.id_usuario).all()
        id_equipos_lider = [e.id_equipo for e in equipos_lider]
        
        if partido.id_equipo_local not in id_equipos_lider and partido.id_equipo_visitante not in id_equipos_lider:
            return jsonify({'error': 'No tienes un equipo en este partido'}), 403
        
        # Obtener eventos ordenados por minuto
        eventos = EventoPartido.query.filter_by(id_partido=id_partido).order_by(EventoPartido.minuto.desc()).all()
        
        return jsonify({
            'eventos': [evento.to_dict() for evento in eventos],
            'total': len(eventos),
            'goles_local': partido.goles_local,
            'goles_visitante': partido.goles_visitante
        }), 200
        
    except Exception as e:
        print(f"❌ ERROR en obtener_eventos_lider: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500