from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from app.middlewares.auth_middleware import role_required
from app.extensions import db
from app.models.partido import Partido
from app.models.campeonato import Campeonato
from app.models.equipo import Equipo
from datetime import datetime


partidos_bp = Blueprint('partidos', __name__)

@partidos_bp.route('', methods=['POST'])
@jwt_required()
@role_required(['admin'])
def crear_partido():
    try: 
        data = request.get_json()
        
        if not data.get('id_campeonato'):
            return jsonify({'error': 'El campeonato es obligatorio'}), 400
        if not data.get('id_equipo_local'):
            return jsonify({'error': 'El equipo local es obligatorio'}), 400
        if not data.get('id_equipo_visitante'):
            return jsonify({'error': 'El equipo visitante es obligatorio'}), 400
        if not data.get('fecha_partido'):
            return jsonify({'error': 'La fecha del partido es obligatoria'}), 400
        if data['id_equipo_local'] == data['id_equipo_visitante']:
            return jsonify({'error': 'Los equipos deben ser diferentes'}), 400

        campeonato = Campeonato.query.get(data['id_campeonato'])
        if not campeonato:
            return jsonify({'error': 'Campeonato no encontrado'}), 404

        equipo_local = Equipo.query.get(data['id_equipo_local'])
        if not equipo_local:
            return jsonify({'error': 'Equipo local no encontrado'}), 404

        equipo_visitante = Equipo.query.get(data['id_equipo_visitante'])
        if not equipo_visitante:
            return jsonify({'error': 'Equipo visitante no encontrado'}), 404
        
        if equipo_local.estado != 'aprobado':
            return jsonify({'error': 'El equipo local no esta aprobado'}), 400
        
        if equipo_visitante.estado != 'aprobado':
            return jsonify({'error': 'El equipo visitante no esta aprobado'}), 400
        
        nuevo_partido = Partido(
            id_campeonato=data['id_campeonato'],
            id_equipo_local=data['id_equipo_local'],
            id_equipo_visitante=data['id_equipo_visitante'],
            fecha_partido=datetime.fromisoformat(data['fecha_partido']),
            lugar=data.get('lugar'),
            jornada=data.get('jornada', 1),
            estado='programado'
        )
        
        db.session.add(nuevo_partido)
        db.session.commit()

        return jsonify({
            'mensaje': 'Partido creado exitosamente',
            'partido': nuevo_partido.to_dict()
        }), 201
        
    except ValueError:
        return jsonify({
            'error': 'Formato de fecha invalido. Use formato ISO: YYYY-MM-DDTHH:MM:SS'
        }), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@partidos_bp.route('', methods=['GET'])
def obtener_partidos(): 
    try:
        id_campeonato = request.args.get('id_campeonato')
        estado = request.args.get('estado')
        jornada = request.args.get('jornada')
        id_equipo = request.args.get('id_equipo')

        query = Partido.query

        if id_campeonato:
            query = query.filter_by(id_campeonato=int(id_campeonato))
        if estado:
            query = query.filter_by(estado=estado)
        if jornada:
            query = query.filter_by(jornada=int(jornada))
        
        if id_equipo:
            equipo_id = int(id_equipo)
            query = query.filter(
                (Partido.id_equipo_local == equipo_id) |
                (Partido.id_equipo_visitante == equipo_id)
            )
        
        partidos = query.order_by(Partido.fecha_partido.desc()).all()

        return jsonify({
            'partidos': [p.to_dict() for p in partidos]
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@partidos_bp.route('/<int:id_partido>', methods=['GET'])
def obtener_partido_por_id(id_partido):
    try:
        partido = Partido.query.get(id_partido)
        
        if not partido:
            return jsonify({'error': 'Partido no encontrado'}), 404
        
        return jsonify({
            'partido': partido.to_dict()
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@partidos_bp.route('/<int:id_partido>', methods=['PUT'])
@jwt_required()
@role_required(['admin'])
def actualizar_partido(id_partido):
    try:
        partido = Partido.query.get(id_partido)
        
        if not partido:
            return jsonify({'error': 'Partido no encontrado'}), 404
        
        data = request.get_json()
        
        if 'fecha_partido' in data:
            partido.fecha_partido = datetime.fromisoformat(data['fecha_partido'])
        
        if 'lugar' in data:
            partido.lugar = data['lugar']
        
        if 'jornada' in data:
            partido.jornada = int(data['jornada'])
        
        if 'observaciones' in data:
            partido.observaciones = data['observaciones']
        
        db.session.commit()
        
        return jsonify({
            'mensaje': 'Partido actualizado',
            'partido': partido.to_dict()
        }), 200
        
    except ValueError:
        return jsonify({'error': 'Formato de fecha inválido. Use formato ISO: YYYY-MM-DDTHH:MM:SS'}), 400
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@partidos_bp.route('/<int:id_partido>/estado', methods=['PATCH'])
@jwt_required()
@role_required(['admin'])
def cambiar_estado_partido(id_partido):
    try:
        partido = Partido.query.get(id_partido)
        
        if not partido:
            return jsonify({'error': 'Partido no encontrado'}), 404
        
        data = request.get_json()
        
        if 'estado' not in data:
            return jsonify({'error': 'El campo estado es requerido'}), 400
        
        estados_validos = ['programado', 'en_juego', 'finalizado', 'cancelado']
        if data['estado'] not in estados_validos:
            return jsonify({
                'error': f'Estado no válido. Debe ser uno de: {", ".join(estados_validos)}'
            }), 400
        
        partido.estado = data['estado']
        db.session.commit()
        
        return jsonify({
            'mensaje': f'Partido cambió a estado: {data["estado"]}',
            'partido': partido.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@partidos_bp.route('/<int:id_partido>', methods=['DELETE'])
@jwt_required()
@role_required(['admin'])
def eliminar_partido(id_partido):
    try:
        partido = Partido.query.get(id_partido)
        
        if not partido:
            return jsonify({'error': 'Partido no encontrado'}), 404
        
        if partido.goles.count() > 0:
            return jsonify({
                'error': 'No se puede eliminar un partido que tiene goles registrados'
            }), 400
        
        db.session.delete(partido)
        db.session.commit()
        
        return jsonify({
            'mensaje': 'Partido eliminado exitosamente'
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500


@partidos_bp.route('/<int:id_partido>/resultado', methods=['PATCH'])
@jwt_required()
@role_required(['admin'])
def registrar_resultado(id_partido):
    try:
        partido = Partido.query.get(id_partido)
        
        if not partido:
            return jsonify({'error': 'Partido no encontrado'}), 404
        
        data = request.get_json()
        
        if 'goles_local' not in data or 'goles_visitante' not in data:
            return jsonify({'error': 'Se requieren goles_local y goles_visitante'}), 400
        
        partido.goles_local = int(data['goles_local'])
        partido.goles_visitante = int(data['goles_visitante'])
        partido.estado = 'finalizado'
        
        db.session.commit()
        
        return jsonify({
            'mensaje': 'Resultado registrado exitosamente',
            'partido': partido.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': str(e)}), 500